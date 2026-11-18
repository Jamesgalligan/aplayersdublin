/* The ticket forms of aplayersdublin.com, carried over unchanged from the live site on 18 Nov 2026 so every lead and
   sale lands where it did: the shared lead delivery (GTLead), the GA and VIP checkout (Whop), the team enquiry and the
   VVIP application. Only the markup and styles around them are new. Do not edit the endpoints here. */

/* ---- live site block 5 ---- */
/* ---------------------------------------------------------------------
     Shared lead delivery for the ticket forms: one payload shape, real
     phone validation, and a post that cannot lose the lead or hold up the
     buyer. The checkout and VVIP forms below both call into this.

     Nothing here knows a checkout URL; those stay in the CFG blocks.

     No Meta call lives in site code. GTM-WL5TT2WF owns every browser tag;
     this file only pushes named events onto window.dataLayer. A Meta Lead
     event is never fired - a value-less Lead is what collapsed our value
     coverage on 25 September - and Purchase value comes from the server,
     off the Whop webhook, not from here.
     --------------------------------------------------------------------- */
  window.GTLead = (function () {
    var EVENTS = "https://columapc.app.n8n.cloud/webhook/gt-event-capture";
    var PHONE_LIB = "https://cdnjs.cloudflare.com/ajax/libs/libphonenumber-js/1.11.20/libphonenumber-js.min.js";
    var QUEUE = "gt_popup_queue";
    var CITY = "Dublin";
    var WAIT = 4000;

    /* Throwaway inboxes and the misspellings we see most often. */
    var BURNER = ("test.com test.co example.com example.org example.net mailinator.com guerrillamail.com " +
      "10minutemail.com tempmail.com temp-mail.org yopmail.com sharklasers.com trashmail.com getnada.com " +
      "dispostable.com maildrop.cc fakeinbox.com throwawaymail.com mytemp.email discard.email spam4.me " +
      "grr.la emailondeck.com moakt.com tempr.email mail7.io harakirimail.com mailnesia.com mailcatch.com " +
      "nada.email").split(" ");
    var TYPOS = {
      "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmaill.com": "gmail.com", "gmail.co": "gmail.com",
      "gmali.com": "gmail.com", "gnail.com": "gmail.com", "gmail.cm": "gmail.com", "gmail.con": "gmail.com",
      "gamil.com": "gmail.com", "gmail.om": "gmail.com", "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com",
      "hotmail.co": "hotmail.com", "hotmil.com": "hotmail.com", "hotmall.com": "hotmail.com",
      "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com", "yahoo.con": "yahoo.com",
      "outlok.com": "outlook.com", "outlook.co": "outlook.com", "outllook.com": "outlook.com",
      "iclould.com": "icloud.com", "icloud.co": "icloud.com", "iclod.com": "icloud.com",
      "protonmai.com": "protonmail.com", "live.co": "live.com"
    };
    var FAKE = ("test tests testing asdf asdfasdf qwerty aaa aaaa fake spam noemail nomail none na noname").split(" ");

    /* libphonenumber loads on the first modal open, so it never delays the
       page, and a blocked CDN falls back to the length checks below rather
       than standing between someone and a ticket. */
    var lib = null;
    function loadPhoneLib() {
      if (lib || window.libphonenumber) { lib = window.libphonenumber || lib; return; }
      if (document.getElementById("gt-phone-lib")) return;
      var s = document.createElement("script");
      s.id = "gt-phone-lib"; s.src = PHONE_LIB; s.async = true;
      s.onload = function () { lib = window.libphonenumber || null; };
      s.onerror = function () { console.warn("[lead] phone library blocked; using length checks"); };
      document.head.appendChild(s);
    }

    function emailProblem(raw) {
      var v = (raw || "").trim();
      if (!v) return "Email is required.";
      if (!/^[^\s@,;:"'()[\]\\]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v)) return "Please enter a valid email address.";
      var at = v.lastIndexOf("@"), user = v.slice(0, at).toLowerCase(), host = v.slice(at + 1).toLowerCase();
      if (user.length < 2 || /\.\./.test(v) || /^\./.test(user) || /\.$/.test(user)) return "Please enter a valid email address.";
      if (host.length > 255 || !/^[a-z0-9.-]+$/.test(host)) return "Please enter a valid email address.";
      if (!/^[a-z]{2,}$/.test(host.split(".").pop())) return "Please enter a valid email address.";
      if (TYPOS[host]) return "Did you mean " + user + "@" + TYPOS[host] + "?";
      if (BURNER.indexOf(host) > -1) return "Please use the email address you actually read.";
      if (FAKE.indexOf(user) > -1 || /^(.)\1{2,}$/.test(user)) return "Please use your real email address.";
      return null;
    }

    function digitsOf(raw) { return (raw || "").replace(/[^\d]/g, "").replace(/^0+/, ""); }
    function e164(dial, raw) { return (dial || "") + digitsOf(raw); }

    /* The number has to be valid for the code picked, which libphonenumber
       decides from its metadata. The length and pattern checks underneath
       catch the junk it still accepts, like 1234567890. */
    function phoneProblem(dial, raw) {
      var d = digitsOf(raw);
      if (!d) return "Phone number is required.";
      if (lib && lib.parsePhoneNumberFromString) {
        var n = null;
        try { n = lib.parsePhoneNumberFromString(e164(dial, raw)); } catch (e) {}
        if (!n || !n.isValid()) return "That is not a valid number for the country code selected.";
      } else if (d.length < 7 || d.length > 14) {
        return "Please enter a valid phone number.";
      }
      if (/^(\d)\1+$/.test(d)) return "Please enter a real phone number.";
      var up = true, down = true;
      for (var i = 1; i < d.length; i++) {
        var a = +d[i - 1], b = +d[i];
        if (b !== (a + 1) % 10) up = false;
        if (b !== (a + 9) % 10) down = false;
      }
      if (up || down) return "Please enter a real phone number.";
      return null;
    }

    function utm() {
      var out = {}, live = null;
      try { live = new URLSearchParams(location.search); } catch (e) {}
      var stored = {};
      try { stored = JSON.parse(sessionStorage.getItem("apc_utm") || sessionStorage.getItem("utm_params") || "{}") || {}; } catch (e) {}
      ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) {
        var v = (live && live.get(k)) || stored[k] || "";
        if (v) out[k] = String(v).trim();
      });
      return out;
    }

    function trakyoId() {
      try { if (window.trakyo_id) return String(window.trakyo_id).trim(); } catch (e) {}
      try {
        var c = ("; " + document.cookie).split("; trakyo_id=");
        if (c.length === 2) { var v = decodeURIComponent(c.pop().split(";").shift()).trim(); if (v) return v; }
      } catch (e) {}
      try { var l = localStorage.getItem("trakyo_id"); if (l) return l.trim(); } catch (e) {}
      try { return new URLSearchParams(location.search).get("trakyo_id") || ""; } catch (e) { return ""; }
    }

    /* Only the keys the CRM expects, and only the ones this form filled in. */
    function build(d) {
      var body = {
        event_type: "popup",
        email: (d.email || "").trim().toLowerCase(),
        firstName: (d.firstName || "").trim(),
        lastName: (d.lastName || "").trim(),
        phone: d.phone,
        city: CITY,
        ticket_type: d.ticket_type
      };
      if (d.company) body.company = d.company.trim();
      if (d.what_building) body.what_building = d.what_building.trim();
      if (d.revenue_range) body.revenue_range = d.revenue_range;
      body.page_url = location.origin + location.pathname + "#tickets";
      var tid = trakyoId();
      if (tid) body.trakyo_id = tid;
      var u = utm();
      ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) { if (u[k]) body[k] = u[k]; });
      body.submitted_at = new Date().toISOString();
      return body;
    }

    /* The lead is written to localStorage before it goes out and removed
       when the webhook answers, so a refused or half-finished post comes
       round again on the next page load instead of disappearing. A retry
       carries the original submitted_at, which makes the pair easy to
       collapse at the n8n end. */
    function queue() { try { return JSON.parse(localStorage.getItem(QUEUE) || "[]") || []; } catch (e) { return []; } }
    function write(rows) { try { localStorage.setItem(QUEUE, JSON.stringify(rows.slice(-10))); } catch (e) {} }
    function hold(body) {
      var id = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);
      var rows = queue(); rows.push({ id: id, body: body, tries: 1 }); write(rows);
      return id;
    }
    function release(id) { write(queue().filter(function (r) { return r.id !== id; })); }

    function post(body) {
      return fetch(EVENTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true
      }).then(function (r) { return r.ok; });
    }

    /* Set while a post is in the air, so a tab closed mid-submit still
       sends the lead by beacon. Cleared by the caller's redirect. */
    var inFlight = null;
    function bail() {
      if (!inFlight || !navigator.sendBeacon) return;
      try { navigator.sendBeacon(EVENTS, new Blob([JSON.stringify(inFlight)], { type: "application/json" })); } catch (e) {}
      inFlight = null;
    }
    window.addEventListener("pagehide", bail);
    window.addEventListener("beforeunload", bail);

    /* Resolves when the webhook answers or after four seconds, whichever
       comes first: the buyer is never held up by our CRM. */
    function popup(d) {
      var body = build(d), id = hold(body);
      inFlight = body;
      console.log("[popup] POST " + EVENTS + "\n" + JSON.stringify(body, null, 2));
      var sent = post(body).then(function (ok) {
        if (ok) { release(id); inFlight = null; }
        else console.warn("[popup] webhook refused the post; queued for one retry");
        return ok;
      }).catch(function (e) {
        console.warn("[popup] webhook unreachable; queued for one retry", e && e.message);
        return false;
      });
      return Promise.race([sent, new Promise(function (r) { setTimeout(function () { r(null); }, WAIT); })]);
    }
    function done() { inFlight = null; }

    /* One retry per held lead, on the next load. */
    (function () {
      var rows = queue();
      if (!rows.length) return;
      write(rows.filter(function (r) { return r.tries < 2; }).map(function (r) {
        return { id: r.id, body: r.body, tries: r.tries + 1 };
      }));
      rows.forEach(function (r) {
        if (r.tries >= 2) return;
        post(r.body).then(function (ok) { if (ok) release(r.id); }).catch(function () {});
      });
    })();

    return {
      popup: popup, done: done, build: build, emailProblem: emailProblem,
      phoneProblem: phoneProblem, e164: e164, loadPhoneLib: loadPhoneLib,
      utm: utm, trakyoId: trakyoId, wait: WAIT
    };
  })();

/* ---- live site block 6 ---- */
(function () {
    var CFG = {
      city: "Dublin",
      checkout: {
        GA: "https://whop.com/checkout/plan_ORxdRhXdHSEEN",
        VIP: "https://whop.com/checkout/plan_fxlqGLFqJy3Jj"
      },
      // The worker opens a Whop checkout that carries the attribution and
      // returns to /thanks. Empty until it is deployed, and the plan links
      // above stay the fallback so a tracking outage never stops a sale.
      worker: "",
      supabase: "https://dbxafbczhrdmruhhcitt.supabase.co",
      key: "sb_publishable_d4TwbbBe9R2ZXFx8ObvIUA__36rfOKi",
      trakyo: "https://app.trakyo.io/api/platforms/custom-form/0dac5cf5-5a10-4f2a-a932-4699a51677da/webhook",
      touchpoint: "https://columapc.app.n8n.cloud/webhook/49834c5a-2150-4de1-abad-f50d17e064f2",
      events: "https://columapc.app.n8n.cloud/webhook/gt-event-capture"
    };
    var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid"];
    var TIERS = { GA: "General Admission", VIP: "VIP Experience", VVIP: "VVIP Experience" };

    // keep campaign tags for the session, like the London site
    try {
      var qs = new URLSearchParams(location.search), found = {}, any = false;
      UTM_KEYS.forEach(function (k) { var v = qs.get(k); if (v) { found[k] = v; any = true; } });
      if (any && !sessionStorage.getItem("apc_utm")) { sessionStorage.setItem("apc_utm", JSON.stringify(found)); sessionStorage.setItem("utm_params", JSON.stringify(found)); }
    } catch (e) {}
    function utm() {
      var a = {}, b = {};
      try { a = JSON.parse(sessionStorage.getItem("utm_params") || "{}"); } catch (e) {}
      try { b = JSON.parse(sessionStorage.getItem("apc_utm") || "{}") || {}; } catch (e) {}
      var out = {}; UTM_KEYS.forEach(function (k) { out[k] = a[k] || b[k] || ""; }); return out;
    }

    var modal = document.getElementById("checkout"), form = document.getElementById("co-form");
    if (!modal || !form) return;
    var err = document.getElementById("co-error"), submit = document.getElementById("co-submit");
    var openedAt = 0, lastTrigger = null, busy = false;

    function trakyoId() {
      try { if (window.trakyo_id) return String(window.trakyo_id).trim(); } catch (e) {}
      try { var c = ("; " + document.cookie).split("; trakyo_id="); if (c.length === 2) { var v = decodeURIComponent(c.pop().split(";").shift()); if (v) return v.trim(); } } catch (e) {}
      try { var l = localStorage.getItem("trakyo_id"); if (l) return l.trim(); } catch (e) {}
      var f = form.querySelector('input[name="trakyo_id"]');
      if (f && f.value) return f.value.trim();
      try { return new URLSearchParams(location.search).get("trakyo_id") || ""; } catch (e) { return ""; }
    }
    function touchpoint(p) {
      try {
        var u = utm(), body = Object.assign({
          touchpoint_date: new Date().toISOString(), touchpoint_type: p.touchpoint_type, event_name: CFG.city,
          name: p.name || "", email: p.email || "", phone: p.phone || "", action: p.action || "", entry_type: p.entry_type || "",
          utm_source: u.utm_source, utm_medium: u.utm_medium, utm_campaign: u.utm_campaign, utm_content: u.utm_content, utm_term: u.utm_term,
          utm: { utm_source: u.utm_source || null, utm_medium: u.utm_medium || null, utm_campaign: u.utm_campaign || null, utm_term: u.utm_term || null, utm_content: u.utm_content || null }
        }, p);
        fetch(CFG.touchpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(function () {});
      } catch (e) {}
    }
    function capped(promise, ms) {
      return Promise.race([promise.catch(function () {}), new Promise(function (r) { setTimeout(r, ms || 3000); })]);
    }
    function fireEvent(type, d) {
      try {
        var email = (d.email || "").trim().toLowerCase();
        if (!email) return;
        var u = utm(), nn = function (v) { return v ? v : null; }, tid = trakyoId();
        var body = {
          event_type: type, firstName: nn(d.firstName), lastName: nn(d.lastName), email: email, phone: nn(d.phone),
          purchase_city: "Dublin", purchase_tier_name: nn(d.tierName), trakyo_id: nn(tid),
          utm_source: nn(u.utm_source), utm_medium: nn(u.utm_medium), utm_campaign: nn(u.utm_campaign),
          utm_content: nn(u.utm_content), utm_term: nn(u.utm_term),
          page_url: location.href, submitted_at: new Date().toISOString()
        };
        fetch(CFG.events, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(function () {});
      } catch (e) {}
    }

    function open(tier) {
      var pick = tier && form.querySelector('input[name="tier"][value="' + tier + '"]');
      if (pick) pick.checked = true;
      err.hidden = true;
      modal.hidden = false;
      document.documentElement.style.overflow = "hidden";
      openedAt = Date.now();
      GTLead.loadPhoneLib();
      setTimeout(function () { document.getElementById("co-first").focus(); }, 30);
    }
    function close() {
      modal.hidden = true;
      document.documentElement.style.overflow = "";
      if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
    }
    document.addEventListener("click", function (e) {
      var trig = e.target.closest("[data-checkout]");
      if (trig) { e.preventDefault(); lastTrigger = trig; open(trig.getAttribute("data-checkout")); return; }
      if (e.target.closest("[data-co-close]")) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });
    window.addEventListener("pageshow", function (ev) { if (ev.persisted) { busy = false; submit.disabled = false; submit.textContent = "Continue to checkout"; } });

    function cookie(name) {
      try {
        var parts = ("; " + document.cookie).split("; " + name + "=");
        return parts.length === 2 ? parts.pop().split(";").shift() : "";
      } catch (e) { return ""; }
    }

    /* Asks the worker for a checkout that carries event_uid and the
       attribution. Returns null on any trouble, and the caller then uses
       the plan link: the buyer is never held up by our tracking. */
    async function openCheckout(tier, d) {
      if (!CFG.worker) return null;
      try {
        var r = await capped(fetch(CFG.worker + "/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier: tier, email: d.email, phone: d.phone, first_name: d.first, last_name: d.last,
            utm_source: d.u.utm_source, utm_medium: d.u.utm_medium, utm_campaign: d.u.utm_campaign,
            utm_content: d.u.utm_content, utm_term: d.u.utm_term, fbclid: d.u.fbclid,
            trakyo_id: d.tid, fbp: cookie("_fbp"), fbc: cookie("_fbc"), page_url: location.href
          })
        }), 6000);
        if (!r || !r.ok) { console.warn("[checkout] worker said " + (r && r.status) + "; using the plan link"); return null; }
        var j = await r.json();
        return j && j.url ? j : null;
      } catch (e) {
        console.warn("[checkout] worker unreachable; using the plan link", e && e.message);
        return null;
      }
    }

    function fail(msg) { err.textContent = msg; err.hidden = false; }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (busy) return;
      err.hidden = true;
      if (form.company_website.value.trim() !== "" || Date.now() - openedAt < 3000) { if (form.company_website.value.trim() !== "") return; }
      var first = form.firstName.value.trim(), last = form.lastName.value.trim(), email = form.email.value.trim();
      var tierInput = form.querySelector('input[name="tier"]:checked'), tier = (tierInput || {}).value || "GA";
      var tierLabel = tierInput && tierInput.parentElement.querySelector("b"), tierName = tierLabel ? tierLabel.textContent.trim() : TIERS[tier];
      if (!first) return fail("First name is required.");
      if (!last) return fail("Last name is required.");
      var bad = GTLead.emailProblem(email);
      if (bad) return fail(bad);
      var dial = form.dial.value, p = GTLead.phoneProblem(dial, form.phone.value);
      if (p) return fail(p);
      if (Date.now() - openedAt < 3000) return fail("One moment, then press continue again.");
      var phone = dial + form.phone.value.replace(/[^\d]/g, "").replace(/^0+/, "");
      var name = (first + " " + last).trim(), tid = trakyoId(), u = utm();
      GTDL.once("event_lead_capture", { email: email, phone: phone, first_name: first, last_name: last });
      busy = true; submit.disabled = true;
      fireEvent("reserve", { firstName: first, lastName: last, email: email, phone: phone, tierName: tierName });

      touchpoint({ touchpoint_type: "form_lead", name: name, email: email, phone: phone, action: "checkout_form_submit", entry_type: tierName });
      submit.disabled = true; submit.textContent = "Taking you to checkout…";
      try {
        // Everything goes out at once and the buyer waits four seconds at
        // most; keepalive lets the requests finish after the redirect.
        await capped(Promise.all([
          GTLead.popup({ firstName: first, lastName: last, email: email, phone: phone, ticket_type: tier }),
          fetch(CFG.supabase + "/rest/v1/leads", {
          method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json", apikey: CFG.key, Authorization: "Bearer " + CFG.key, Prefer: "return=minimal" },
          body: JSON.stringify({ name: name, email: email, phone: phone })
        }).catch(function () {}),
          fetch(CFG.trakyo, {
          method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, name: name, phone: phone, trakyo_id: tid, form_name: "GT Live Ticket", city: CFG.city })
        }).catch(function () {}),
          fetch(CFG.supabase + "/functions/v1/submit-lead", {
          method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json", apikey: CFG.key, Authorization: "Bearer " + CFG.key },
          body: JSON.stringify({ form: "live_ticket", payload: {
            firstName: first, lastName: last, email: email, phone: "+" + phone.replace(/[^\d]/g, ""), trakyo_id: tid,
            submitted_at: new Date().toISOString(), utm_source: u.utm_source, utm_medium: u.utm_medium, utm_campaign: u.utm_campaign,
            utm_content: u.utm_content, utm_term: u.utm_term, purchase_city: CFG.city, purchase_tier_name: tierName
          } })
        }).catch(function () {})
        ]), GTLead.wait);
        touchpoint({ touchpoint_type: "form_submit", name: name, email: email, phone: phone, action: "whop_redirect", entry_type: tierName });
        var q = new URLSearchParams();
        UTM_KEYS.forEach(function (k) { if (u[k]) q.set(k, u[k]); });
        if (tid) q.set("trakyo_id", tid);
        var qsOut = q.toString();
        // A ticket button carrying its own checkout link wins; otherwise the
        // tier's link from CFG above. Neither is rewritten beyond the tags.
        var own = (lastTrigger && lastTrigger.getAttribute("href")) || "";
        var fallback = /^https?:/i.test(own) ? own : (CFG.checkout[tier] || CFG.checkout.GA);
        fallback += qsOut ? (fallback.indexOf("?") > -1 ? "&" : "?") + qsOut : "";

        var session = await openCheckout(tier, { email: email, phone: phone, first: first, last: last, u: u, tid: tid });
        GTDL.push("event_checkout_view", {
          tier: tier,
          value: session && session.value,
          currency: session && session.currency,
          event_uid: session && session.event_uid,
          email: email, phone: phone, first_name: first, last_name: last
        });
        GTLead.done();
        location.href = (session && session.url) || fallback;
      } catch (x) {
        fail("Something went wrong. Please try again.");
        busy = false; submit.disabled = false; submit.textContent = "Continue to checkout";
      }
    });
  })();

/* ---- live site block 7 ---- */
(function () {
    var CFG = {
      city: "Dublin",
      supabase: "https://dbxafbczhrdmruhhcitt.supabase.co",
      key: "sb_publishable_d4TwbbBe9R2ZXFx8ObvIUA__36rfOKi",
      trakyo: "https://app.trakyo.io/api/platforms/custom-form/0dac5cf5-5a10-4f2a-a932-4699a51677da/webhook",
      touchpoint: "https://columapc.app.n8n.cloud/webhook/49834c5a-2150-4de1-abad-f50d17e064f2",
      events: "https://columapc.app.n8n.cloud/webhook/gt-event-capture"
    };
    var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid"];
    var modal = document.getElementById("team"), form = document.getElementById("tm-form");
    if (!modal || !form) return;
    var err = document.getElementById("tm-error"), submit = document.getElementById("tm-submit");
    var slot = document.getElementById("tm-logo-slot"), colour = document.getElementById("tm-colour");
    var drop = document.getElementById("tm-drop"), fileInput = document.getElementById("tm-logo");
    var pvName = document.getElementById("tm-pv-name"), pvRole = document.getElementById("tm-pv-role"), pvCo = document.getElementById("tm-pv-co");
    var seatMap = document.getElementById("tm-seatmap"), seatCap = document.getElementById("tm-seat-cap");
    var logo = null, openedAt = 0, busy = false, lastTrigger = null;

    // country codes: same list as the checkout form
    var dialFrom = document.getElementById("co-dial");
    if (dialFrom) document.getElementById("tm-dial").innerHTML = dialFrom.innerHTML;

    function utm() {
      var a = {}, b = {};
      try { a = JSON.parse(sessionStorage.getItem("utm_params") || "{}"); } catch (e) {}
      try { b = JSON.parse(sessionStorage.getItem("apc_utm") || "{}") || {}; } catch (e) {}
      var o = {}; UTM_KEYS.forEach(function (k) { o[k] = a[k] || b[k] || ""; }); return o;
    }
    function trakyoId() {
      try { if (window.trakyo_id) return String(window.trakyo_id).trim(); } catch (e) {}
      try { var c = ("; " + document.cookie).split("; trakyo_id="); if (c.length === 2) { var v = decodeURIComponent(c.pop().split(";").shift()); if (v) return v.trim(); } } catch (e) {}
      try { var l = localStorage.getItem("trakyo_id"); if (l) return l.trim(); } catch (e) {}
      try { return new URLSearchParams(location.search).get("trakyo_id") || ""; } catch (e) { return ""; }
    }
    function capped(p, ms) { return Promise.race([p.catch(function () {}), new Promise(function (r) { setTimeout(r, ms || 3000); })]); }

    // ---- previews ----
    function drawSeats() {
      var n = Math.max(5, Math.min(500, parseInt(document.getElementById("tm-seats").value, 10) || 5));
      var per = 10, rows = 5, cols = 10, c = colour.value, out = "";
      for (var r = 0; r < rows; r++) {
        for (var i = 0; i < cols; i++) {
          var idx = r * cols + i, mine = idx < Math.min(n, rows * cols);
          out += '<rect x="' + (6 + i * 19) + '" y="' + (26 + r * 18) + '" width="14" height="12" rx="3" fill="' + (mine ? c : "#26262499") + '"/>';
        }
      }
      out = '<rect x="46" y="6" width="108" height="10" rx="3" fill="#3B3B39"/><text x="100" y="15" text-anchor="middle" font-family="ui-monospace, monospace" font-size="6" fill="#9C9C97">STAGE</text>' + out;
      seatMap.innerHTML = out;
      var full = Math.floor(Math.min(n, 50) / per);
      seatCap.textContent = n + " seats together" + (full >= 1 ? " · " + full + (full > 1 ? " rows" : " row") + " reserved" : "");
    }
    function refresh() {
      var nm = form.contactName.value.trim(), ro = form.role.value.trim(), co = form.company.value.trim();
      pvName.textContent = nm || "Your name";
      pvRole.textContent = ro || "Founder";
      pvCo.textContent = co || "Your company";
      document.getElementById("tm-pv-tier").textContent = form.teamTier.value;
      document.querySelector(".tm-preview").style.setProperty("--bc", colour.value);
      drawSeats();
    }
    form.addEventListener("input", refresh);
    form.addEventListener("change", refresh);
    colour.addEventListener("input", refresh);

    // ---- logo ----
    function dominantColour(img) {
      try {
        var c = document.createElement("canvas"), n = 64;
        c.width = c.height = n;
        var x = c.getContext("2d");
        var iw = img.naturalWidth || 300, ih = img.naturalHeight || 300;
        var sc = Math.min(n / iw, n / ih), dw = Math.max(1, iw * sc), dh = Math.max(1, ih * sc);
        x.drawImage(img, (n - dw) / 2, (n - dh) / 2, dw, dh);
        var d = x.getImageData(0, 0, n, n).data, counts = {}, best = null, bestN = 0;
        for (var i = 0; i < d.length; i += 4) {
          var r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
          if (a < 200) continue;
          if (r > 238 && g > 238 && b > 238) continue;
          if (r < 26 && g < 26 && b < 26) continue;
          var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx - mn < 28) continue;            // skip greys: a grey logo keeps the default colour
          var k = (r >> 4) + "," + (g >> 4) + "," + (b >> 4);
          counts[k] = (counts[k] || 0) + 1;
          if (counts[k] > bestN) { bestN = counts[k]; best = [r, g, b]; }
        }
        if (!best) return null;
        return "#" + best.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
      } catch (e) { return null; }
    }
    function shrink(img, type) {
      try {
        var max = 480, w = img.naturalWidth || 480, h = img.naturalHeight || 480;
        var sc = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(h * sc));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/png");
      } catch (e) { return null; }
    }
    function useFile(file) {
      if (!file) return;
      if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) return fail("Please upload a PNG, JPG or SVG.");
      if (file.size > 4 * 1024 * 1024) return fail("That logo is over 4MB. Please upload a smaller file.");
      err.hidden = true;
      var reader = new FileReader();
      reader.onload = function () {
        var src = reader.result, img = new Image();
        img.onload = function () {
          var isSvg = file.type === "image/svg+xml";
          var data = isSvg ? src : (shrink(img, file.type) || src);
          logo = { name: file.name, type: file.type, data: data };
          slot.innerHTML = '<img alt="">';
          slot.querySelector("img").src = src;
          drop.innerHTML = "<b>" + file.name.slice(0, 40) + "</b><small>Click to replace</small>";
          var dom = dominantColour(img);          // works for SVG too, drawn from a data URL
          if (dom) colour.value = dom;
          refresh();
        };
        img.onerror = function () { fail("That image could not be read. Try a PNG or JPG."); };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
    fileInput.addEventListener("change", function () { useFile(fileInput.files[0]); });
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("is-over"); }); });
    drop.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files[0]) useFile(e.dataTransfer.files[0]); });

    // ---- open / close ----
    function open() { err.hidden = true; modal.hidden = false; document.documentElement.style.overflow = "hidden"; openedAt = Date.now(); refresh(); setTimeout(function () { document.getElementById("tm-company").focus(); }, 30); }
    function close() { modal.hidden = true; document.documentElement.style.overflow = ""; if (lastTrigger && lastTrigger.focus) lastTrigger.focus(); }
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-team]");
      if (t) { e.preventDefault(); lastTrigger = t; open(); return; }
      if (e.target.closest("[data-tm-close]")) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });

    function fail(msg) { err.textContent = msg; err.hidden = false; return false; }
    function phoneProblem(raw) {
      var d = (raw || "").replace(/[^\d]/g, "").replace(/^0+/, "");
      if (!d) return "Phone number is required.";
      if (d.length < 7 || d.length > 14) return "Please enter a valid phone number.";
      if (/^(\d)\1+$/.test(d)) return "Please enter a real phone number.";
      return null;
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (busy) return;
      err.hidden = true;
      if (form.tm_website.value.trim() !== "") return;
      var company = form.company.value.trim(), contact = form.contactName.value.trim();
      var role = form.role.value.trim(), email = form.email.value.trim().toLowerCase();
      var seats = Math.max(5, parseInt(form.seats.value, 10) || 0);
      if (!company) return fail("Company name is required.");
      if (!contact) return fail("Your name is required.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("Please enter a valid email address.");
      if (seats < 5) return fail("Team seats start at 5.");
      var p = phoneProblem(form.phone.value);
      if (p) return fail(p);
      if (Date.now() - openedAt < 3000) return fail("One moment, then press request again.");
      var phone = form.tm_dial ? "" : document.getElementById("tm-dial").value + form.phone.value.replace(/[^\d]/g, "").replace(/^0+/, "");
      var parts = contact.split(/\s+/), first = parts.shift() || contact, last = parts.join(" ");
      var notes = (form.notes.value || "").trim().slice(0, 1000);
      var teamTier = form.teamTier.value;
      GTDL.once("event_lead_capture", { email: email, phone: phone, first_name: first, last_name: last });
      var tid = trakyoId(), u = utm(), nn = function (v) { return v ? v : null; };

      busy = true; submit.disabled = true; submit.textContent = "Sending…";
      try {
        fetch(CFG.touchpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, keepalive: true,
          body: JSON.stringify({ touchpoint_date: new Date().toISOString(), touchpoint_type: "form_lead", event_name: CFG.city, name: contact, email: email, phone: phone, action: "team_enquiry_submit", entry_type: "Team", company: company, seats: seats, notes: notes, team_ticket_type: teamTier }) }).catch(function () {});
        fetch(CFG.events, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
          body: JSON.stringify({
            event_type: "team_enquiry", firstName: first, lastName: nn(last), email: email, phone: phone,
            purchase_city: "Dublin", purchase_tier_name: "Team", trakyo_id: nn(tid),
            utm_source: nn(u.utm_source), utm_medium: nn(u.utm_medium), utm_campaign: nn(u.utm_campaign),
            utm_content: nn(u.utm_content), utm_term: nn(u.utm_term),
            page_url: location.href, submitted_at: new Date().toISOString(),
            company_name: company, contact_role: nn(role), seats: seats, team_ticket_type: teamTier, brand_colour: colour.value,
            logo_filename: logo ? logo.name : null, logo_data_url: logo ? logo.data : null, notes: nn(notes)
          }) }).catch(function () {});
        await capped(fetch(CFG.supabase + "/rest/v1/leads", { method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json", apikey: CFG.key, Authorization: "Bearer " + CFG.key, Prefer: "return=minimal" },
          body: JSON.stringify({ name: contact, email: email, phone: phone }) }), 4000);
        await capped(fetch(CFG.trakyo, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, name: contact, phone: phone, trakyo_id: tid, form_name: "GT Team Enquiry", city: CFG.city }) }));
        await capped(fetch(CFG.supabase + "/functions/v1/submit-lead", { method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json", apikey: CFG.key, Authorization: "Bearer " + CFG.key },
          body: JSON.stringify({ form: "team", payload: { firstName: first, lastName: last, email: email, phone: "+" + phone.replace(/[^\d]/g, ""), trakyo_id: tid, submitted_at: new Date().toISOString(), utm_source: u.utm_source, utm_medium: u.utm_medium, utm_campaign: u.utm_campaign, utm_content: u.utm_content, utm_term: u.utm_term, purchase_city: CFG.city, purchase_tier_name: "Team", company_name: company, contact_role: role, seats: seats, team_ticket_type: teamTier, notes: notes } } ) }));
        form.innerHTML = '<div class="tm-done"><h3>Thank you, ' + first.replace(/[<>]/g, "") + '.</h3><p>We\'ll come back to you within 24 hours with ' + seats + ' ' + teamTier + ' seats for ' + company.replace(/[<>]/g, "") + '.</p></div>';
      } catch (x) {
        busy = false; submit.disabled = false; submit.textContent = "Request team seats";
        fail("Something went wrong. Please try again.");
      }
    });
    refresh();
  })();

/* ---- live site block 8 ---- */
(function () {
    var CFG = {
      city: "Dublin",
      supabase: "https://dbxafbczhrdmruhhcitt.supabase.co",
      key: "sb_publishable_d4TwbbBe9R2ZXFx8ObvIUA__36rfOKi",
      trakyo: "https://app.trakyo.io/api/platforms/custom-form/0dac5cf5-5a10-4f2a-a932-4699a51677da/webhook",
      touchpoint: "https://columapc.app.n8n.cloud/webhook/49834c5a-2150-4de1-abad-f50d17e064f2",
      events: "https://columapc.app.n8n.cloud/webhook/gt-event-capture"
    };
    var KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid"];
    var modal = document.getElementById("vvip"), form = document.getElementById("vv-form");
    if (!modal || !form) return;
    var err = document.getElementById("vv-error"), submit = document.getElementById("vv-submit");
    var openedAt = 0, busy = false, lastTrigger = null;
    var dialFrom = document.getElementById("co-dial");
    if (dialFrom) document.getElementById("vv-dial").innerHTML = dialFrom.innerHTML;

    function utm() {
      var a = {}, b = {};
      try { a = JSON.parse(sessionStorage.getItem("utm_params") || "{}"); } catch (e) {}
      try { b = JSON.parse(sessionStorage.getItem("apc_utm") || "{}") || {}; } catch (e) {}
      var o = {}; KEYS.forEach(function (k) { o[k] = a[k] || b[k] || ""; }); return o;
    }
    function trakyoId() {
      try { if (window.trakyo_id) return String(window.trakyo_id).trim(); } catch (e) {}
      try { var c = ("; " + document.cookie).split("; trakyo_id="); if (c.length === 2) { var v = decodeURIComponent(c.pop().split(";").shift()); if (v) return v.trim(); } } catch (e) {}
      try { var l = localStorage.getItem("trakyo_id"); if (l) return l.trim(); } catch (e) {}
      try { return new URLSearchParams(location.search).get("trakyo_id") || ""; } catch (e) { return ""; }
    }
    function capped(p, ms) { return Promise.race([p.catch(function () {}), new Promise(function (r) { setTimeout(r, ms || 3000); })]); }
    function fail(m) { err.textContent = m; err.hidden = false; return false; }
    function open() { err.hidden = true; modal.hidden = false; document.documentElement.style.overflow = "hidden"; openedAt = Date.now(); GTLead.loadPhoneLib(); setTimeout(function () { document.getElementById("vv-first").focus(); }, 30); }
    function close() { modal.hidden = true; document.documentElement.style.overflow = ""; if (lastTrigger && lastTrigger.focus) lastTrigger.focus(); }
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-vvip]");
      if (t) { e.preventDefault(); lastTrigger = t; open(); return; }
      if (e.target.closest("[data-vv-close]")) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (busy) return;
      err.hidden = true;
      if (form.vv_website.value.trim() !== "") return;
      var first = form.firstName.value.trim(), last = form.lastName.value.trim();
      var email = form.email.value.trim().toLowerCase(), company = form.company.value.trim();
      var notes = (form.notes.value || "").trim().slice(0, 1000), revenue = form.revenue.value;
      if (!first) return fail("First name is required.");
      if (!last) return fail("Last name is required.");
      var bad = GTLead.emailProblem(email);
      if (bad) return fail(bad);
      var dial = document.getElementById("vv-dial").value;
      var pp = GTLead.phoneProblem(dial, form.phone.value);
      if (pp) return fail(pp);
      if (!company) return fail("Company is required.");
      if (!revenue) return fail("Please pick your monthly revenue range.");
      if (Date.now() - openedAt < 3000) return fail("One moment, then press request again.");
      var phone = GTLead.e164(dial, form.phone.value);
      GTDL.once("event_lead_capture", { email: email, phone: phone, first_name: first, last_name: last });
      var name = (first + " " + last).trim(), tid = trakyoId(), u = utm(), nn = function (v) { return v ? v : null; };

      busy = true; submit.disabled = true; submit.textContent = "Sending…";
      try {
        GTLead.popup({ firstName: first, lastName: last, email: email, phone: phone, ticket_type: "VVIP",
          company: company, what_building: notes, revenue_range: revenue });
        fetch(CFG.touchpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, keepalive: true,
          body: JSON.stringify({ touchpoint_date: new Date().toISOString(), touchpoint_type: "form_lead", event_name: CFG.city, name: name, email: email, phone: phone, action: "vvip_request_submit", entry_type: "VVIP Experience", company: company, notes: notes }) }).catch(function () {});
        fetch(CFG.events, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
          body: JSON.stringify({ event_type: "vvip_request", firstName: first, lastName: last, email: email, phone: phone,
            purchase_city: "Dublin", purchase_tier_name: "VVIP Experience", trakyo_id: nn(tid),
            utm_source: nn(u.utm_source), utm_medium: nn(u.utm_medium), utm_campaign: nn(u.utm_campaign),
            utm_content: nn(u.utm_content), utm_term: nn(u.utm_term), page_url: location.href,
            submitted_at: new Date().toISOString(), company_name: nn(company), notes: nn(notes) }) }).catch(function () {});
        await capped(fetch(CFG.supabase + "/rest/v1/leads", { method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json", apikey: CFG.key, Authorization: "Bearer " + CFG.key, Prefer: "return=minimal" },
          body: JSON.stringify({ name: name, email: email, phone: phone }) }), 4000);
        await capped(fetch(CFG.trakyo, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, name: name, phone: phone, trakyo_id: tid, form_name: "GT VVIP Request", city: CFG.city }) }));
        await capped(fetch(CFG.supabase + "/functions/v1/submit-lead", { method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json", apikey: CFG.key, Authorization: "Bearer " + CFG.key },
          body: JSON.stringify({ form: "vvip", payload: { firstName: first, lastName: last, email: email, phone: "+" + phone.replace(/[^\d]/g, ""), trakyo_id: tid, submitted_at: new Date().toISOString(), utm_source: u.utm_source, utm_medium: u.utm_medium, utm_campaign: u.utm_campaign, utm_content: u.utm_content, utm_term: u.utm_term, purchase_city: CFG.city, purchase_tier_name: "VVIP Experience", company_name: company, notes: notes } }) }));
        GTLead.done();
        form.innerHTML = '<div class="tm-done"><h3>Thank you, ' + first.replace(/[<>]/g, "") + '.</h3><p>We\'ll come back to you within 24 hours about one of the twenty VVIP seats.</p></div>';
      } catch (x) {
        busy = false; submit.disabled = false; submit.textContent = "Request access";
        fail("Something went wrong. Please try again.");
      }
    });
  })();
