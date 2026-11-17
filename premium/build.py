"""Builds premium/index.html from uplift/index.html. Run again after the uplift page's words change:
       python3 premium/build.py

   The premium page IS the uplift page: the same words, the same serif, the same photographs, and the same stylesheet
   (uplift/site.css), with premium.css laid over it. Three things differ:
     1. no cream: the daytime sections take a deep colour, blue (?look=blue, the default) or green (?look=green);
     2. the two signed books are a photograph of the real covers on a table (img/books-on-table.jpg);
     3. the tickets are a photograph of three printed, foil-lettered tickets (img/tickets-<look>.jpg), with what each
        includes set out underneath.
   Both photographs are rendered by studio/shoot.html (see its header)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
t = open(os.path.join(HERE, '..', 'uplift', 'index.html'), encoding='utf-8').read()

def rep(old, new, n=1):
    global t
    assert t.count(old) == n, (t.count(old), old[:80])
    t = t.replace(old, new)

def cut(start, end, new):
    """replace everything from the first `start` up to and including the next `end`"""
    global t
    a = t.index(start); b = t.index(end, a) + len(end)
    t = t[:a] + new + t[b:]

# ---------------------------------------------------------------- the head: the same fonts, both stylesheets, the look
cut('<!-- Niall\'s version of the Dublin page', '<script>document.documentElement.classList.add(\'js\');</script>', '''<!-- The premium version of Niall's Dublin page (premium/), 16 Nov 2026. The uplift page in a deep colour instead of
     cream: ?look=blue or ?look=green. Local review only. Made by build.py from uplift/index.html.
     Nothing typed into a form is sent anywhere. -->
<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; frame-src 'none'">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<link rel="preload" as="image" href="../img/hero/gala-dinner.jpg">
<link rel="stylesheet" href="../uplift/site.css">
<link rel="stylesheet" href="premium.css">
<script>
  document.documentElement.classList.add('js');
  document.documentElement.setAttribute('data-look', /[?&]look=green/.test(location.search) ? 'green' : 'blue');
</script>''')

# ---------------------------------------------------------------- the two signed books: the photograph
cut('        <div class="s books-slide"><div class="books">', '        </div></div>\n',
    '        <img class="s" src="img/books-on-table.jpg" alt="" loading="lazy">\n')
cut('<li class="rise has-books" data-cap="Both signed"><div class="row-books">', '</div><div>',
    '<li class="rise has-books" data-cap="Both signed, one of each"><img src="img/books-on-table.jpg" alt="The Purposeful Decision Maker and Buy Back Your Time lying on a walnut table, with a pen" loading="lazy"><div>')

# ---------------------------------------------------------------- the tickets: the photograph, then what each includes
def lis(items):
    return '<ul>' + ''.join('<li>%s</li>' % i for i in items) + '</ul>'
def tier(k, name, days, items, meta, button, extra=''):
    return '''
      <article class="tier rise%s">
        <p class="label k">%s</p>
        <h3>%s</h3>
        <p class="days">%s</p>
        %s
        <p class="label meta">%s</p>
        %s
      </article>''' % (extra, k, name, days, lis(items), meta, button)

TICKETS = '''<figure class="tk-shot rise">
      <img class="for-blue" src="img/tickets-blue.jpg" alt="The three tickets lying on a walnut table: General Admission, VIP and VVIP, each with its photograph and gold foil lettering" loading="lazy">
      <img class="for-green" src="img/tickets-green.jpg" alt="The three tickets lying on a walnut table: General Admission, VIP and VVIP, each with its photograph and gold foil lettering" loading="lazy">
    </figure>
    <div class="tiers">''' + tier(
    'One day', 'General <em>Admission</em>', 'Saturday 19 December',
    ['The main conference, 10:00 to 18:00', '8+ speakers on the main stage', 'A three-course lunch', 'Software onboardings', 'Two signed books', 'The Saturday afterparty'],
    'Powerscourt Hotel', '<button class="pill solid" data-open="reserve" data-ticket="GA">Get GA ticket</button>') + tier(
    'Two days · recommended', 'VIP <em>Experience</em>', 'Saturday 19 + Sunday 20',
    ['Everything in General Admission', 'The Sunday gala, in black tie', 'The A Players awards', 'Live music into the night'],
    'Powerscourt Hotel · The Round Room', '<button class="pill solid" data-open="reserve" data-ticket="VIP">Get VIP ticket</button>', ' pick') + tier(
    'Three days · by application', 'VVIP <em>Experience</em>', 'Friday 18 to Sunday 20',
    ['Everything in VIP', 'Friday hot seats and workshops', 'Expert roundtables across seven topics', 'The founders’ dinner on Friday night'],
    'Twenty seats', '<button class="pill ghost" data-open="vvip">Request access</button>') + '''
    </div>
    <article class="team-line rise">
      <div><p class="label k">For companies &amp; clients</p><h3>Team, <em>from 5 seats</em></h3></div>
      <p>Your seats together in a reserved block, your logo on co-branded lanyards, and named badges for everyone you bring. General Admission, VIP or VVIP seats.</p>
      <button class="pill ghost" data-open="team">Enquire for teams</button>
    </article>
'''
cut('    <div class="tickets">', '''      </article>
    </div>
''', '    ' + TICKETS)

# ---------------------------------------------------------------- the Round Room in photographs, under its own band
rep('        <div><b>205 yrs</b><span class="label">Ireland’s oldest purpose-built venue</span></div>\n      </div>\n    </div>\n',
    '''        <div><b>205 yrs</b><span class="label">Ireland’s oldest purpose-built venue</span></div>
      </div>
    </div>
    <div class="venue-shots rise carpet">
      <figure class="big"><img src="@@venue/round-room-entrance.jpg" alt="The Round Room’s entrance on Dawson Street at night: a red carpet under the navy canopy, the hedges strung with lights" loading="lazy"><figcaption class="label">The red carpet, Dawson Street</figcaption></figure>
      <figure><img src="@@venue/round-room-gala.jpg" alt="The Round Room dressed for a gala dinner, the ceiling draped in red and gold, every table full" loading="lazy"><figcaption class="label">The Round Room, dressed for a gala</figcaption></figure>
      <figure><img src="@@venue/round-room-dinner.jpg" alt="The Round Room set for dinner, round tables under the ring of lights" loading="lazy"><figcaption class="label">Set for dinner, under the dome</figcaption></figure>
    </div>
''')
rep('<div class="venue">', '<div class="venue has-shots">')

# ---------------------------------------------------------------- review only: the switch between the two colours
rep('<div class="bar label" id="bar">', '''<div class="looks label" id="looks" role="group" aria-label="Review only: switch the colour">
  <span>Colour</span><button data-look-set="blue" aria-label="Blue"></button><button data-look-set="green" aria-label="Green"></button>
</div>

<div class="bar label" id="bar">''')

# ---------------------------------------------------------------- where things live now
t = t.replace('src="img/books-on-table.jpg"', 'src="@@books"').replace('src="img/tickets-', 'src="@@tickets-')
t = t.replace('src="img/', 'src="../uplift/img/').replace('poster="img/', 'poster="../uplift/img/').replace('src="media/', 'src="../uplift/media/')
t = t.replace('src="@@books"', 'src="img/books-on-table.jpg"').replace('src="@@tickets-', 'src="img/tickets-').replace('src="@@venue/', 'src="img/venue/')
rep('<script src="data.js"></script>', '<script src="../uplift/data.js"></script>')
rep('<script src="site.js"></script>', '<script src="premium.js"></script>')
rep('<title>A Players Dublin · 18 to 20 December 2026</title>', '<title>A Players Dublin · 18 to 20 December 2026 · premium</title>')

assert '—' not in t and '–' not in t, 'a long dash got in'
open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(t)
print('premium/index.html written:', len(t), 'characters')
