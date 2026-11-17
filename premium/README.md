# The premium Dublin page: two colours to choose from

This folder is the Dublin page from `uplift/` with the cream taken out. It comes in two colours, blue and green.
Everything else is the same page: the same words, the same serif, the same photographs, the same layout.
The live page (`index.html` at the top of the repo) and `uplift/` are untouched.

## See both

- Blue: https://aplayers-dublin-premium.vercel.app/blue
- Green: https://aplayers-dublin-premium.vercel.app/green

Or open `premium/index.html` from this branch. It opens in blue, and the two swatches on the left edge switch the
colour without reloading, so you can compare the same section in both.

## Choose one

Both colours are one page. Two small changes in `premium/index.html` lock it to the one you pick:

1. Near the top, in the short script in the head, the line that sets `data-look` ends with `? 'green' : 'blue'`.
   Replace that whole condition with the colour you want, so the line reads
   `document.documentElement.setAttribute('data-look', 'green');` (or `'blue'`).
2. Near the bottom, delete the block that starts `<div class="looks label" id="looks"`. That is the review switch.

The tickets photograph exists once per colour (`img/tickets-blue.jpg`, `img/tickets-green.jpg`). The page shows the
one that matches; the other picture and its `<img class="for-...">` line can then go.

## Make your own edits

| To change | Edit |
|---|---|
| Words, sections, buttons | `premium/index.html` |
| The two colours | the top of `premium/premium.css` (one short block per colour) |
| Everything else about the look | `uplift/site.css`, which this page loads first |
| Speaker profiles, the door time | `uplift/data.js` |
| Photographs | `uplift/img/`, `img/hero/` and `premium/img/` |

`premium/index.html` was generated from `uplift/index.html` by `premium/build.py`. If you edit `index.html` by hand,
don't run `build.py` again: it would write over your edits. If you would rather change the words once for both
pages, edit `uplift/index.html` and run `python3 premium/build.py`.

### The books and the tickets

They are pictures, not page elements: `img/books-on-table.jpg`, `img/tickets-blue.jpg`, `img/tickets-green.jpg`.
They were rendered in `premium/studio/`, a small virtual photo studio (real light and shadow on a scanned walnut
table). The wording on the tickets is in `studio/tickets.js`; the books carry their real covers.

To re-shoot after a change, serve the repo folder locally and run, from the repo folder:

    STUDIO_URL=http://localhost:8000/premium/studio/shoot.html \
      node premium/studio/shoot.mjs "shot=tickets&look=blue&w=1440&h=900&spp=220&key=11&top=4.2&fov=34&cy=0.33&cz=0.255&woodc=%23756860&envi=0.22" premium/img/tickets-blue.jpg

Swap `look=blue` for `look=green` for the other one. The books:

    "shot=books&w=1120&h=1400&spp=420&key=17&f=10&cy=0.70&cz=0.50&tx=0.02&tz=0.045&cx=0.045&px=0.118&pz=-0.11&pr=-0.9"

It needs Google Chrome and Node, and takes about five minutes a picture. `studio/art.html` shows the tickets'
artwork flat, which is quicker for checking wording.

## Before it goes live

- **The forms send nothing.** "Continue to checkout" goes to `checkout.local.html`, which is not in the repo. The
  lead capture and the Whop links from the live page need putting back.
- **No ticket prices are shown**, as on the live page.
- **The venue photographs are the venues' own.** Powerscourt's are in `uplift/img/venue/` and the Round Room's in
  `premium/img/venue/`. They are stand-ins: ask each venue for its press pack or its say-so first.
- **The tickets picture shows printed, foil-lettered tickets.** If guests only get a ticket by email, say so on the
  page or change the picture.
- **The page is marked `noindex`.** Take that line out of the head when it goes live.
