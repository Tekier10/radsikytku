(() => {
  "use strict";

  const CUTOFF_HOUR = 18; // po 18:00 už "zítra" nepovolíme

  const RK = {
    P: "rk_note_product_",
    N: "rk_name_",
    DD: "rk_delivery_date",
    DT: "rk_delivery_time",
  };

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [].slice.call(r.querySelectorAll(s));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  const page = {
    prod: () => !!q("#product-detail-form"),
    step1: () => q("body") && q("body").classList.contains("in-krok-1"),
    step2: () =>
      (q("body") && q("body").classList.contains("in-krok-2")) ||
      (q("body") && q("body").classList.contains("in-krok-3")),
  };

  const todayISO = () => new Date().toISOString().slice(0, 10);

  const tomorrowISO = () => {
    const d = new Date();
    const add = d.getHours() >= CUTOFF_HOUR ? 2 : 1;
    d.setDate(d.getDate() + add);
    return d.toISOString().slice(0, 10);
  };

  const minsNow = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };

  const startMin = (txt) => {
    const m = String(txt || "").match(/^(\d{1,2}):(\d{2})/);
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
  };

  const submitButtons = () =>
    qa("form#order-form button[type='submit'], .next-step button, .form-actions button");

  // ============================
  // LOCK (blokování objednání)
  // ============================
  const lock = {
    ok: { zip: true, delivery: true },

    update() {
      const ok = !!(this.ok.zip && this.ok.delivery);
      submitButtons().forEach((b) => (b.disabled = !ok));
      return ok;
    },

    setZip(ok) {
      this.ok.zip = !!ok;
      this.update();
    },

    setDelivery(ok) {
      this.ok.delivery = !!ok;
      this.update();
    },

    bindHardBlock() {
      const form = q("form#order-form") || q("form");
      if (!form || form.dataset.rkLock) return;
      form.dataset.rkLock = "1";
      form.addEventListener(
        "submit",
        (e) => {
          if (!lock.update()) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true
      );
    },
  };

  // ============================
  // ✅ POZNÁMKA U PRODUKTU (textarea)
  // ============================
  const productNote = () => {
    const f = q("#product-detail-form");
    if (!f) return;

    const idEl = q("input[name='productId']", f);
    const id = idEl ? idEl.value : "";
    if (!id) return;

    if (q(".rkbox", f)) return;

    const nmEl = q("h1");
    const nm = nmEl && nmEl.innerText ? nmEl.innerText.trim() : "Produkt " + id;
    sessionStorage.setItem(RK.N + id, nm);

    const key = RK.P + id;

    const box = document.createElement("div");
    box.className = "rkbox";
    box.innerHTML =
      '<label for="rkNote">Vzkaz ke kytici</label>' +
      '<textarea id="rkNote" maxlength="250" placeholder="Např. Všechno nejlepší! ❤️"></textarea>' +
      '<div class="rkhelp">Max 250 znaků</div>';

    const btn = q(".add-to-cart", f);
    if (btn && btn.parentNode) btn.parentNode.insertBefore(box, btn);

    const t = q("#rkNote", box);
    t.value = sessionStorage.getItem(key) || "";

    const save = () => sessionStorage.setItem(key, t.value || "");
    on(t, "input", save);
    on(f, "submit", save);
  };

  // ============================
  // ✅ PODROBNOSTI O DORUČENÍ (krok 1)
  // ============================
  const deliveryBox = () => {
    if (!page.step1()) return;

    const place =
      q(".co-delivery-method") ||
      q(".shipping-billing-table") ||
      q(".shipping") ||
      q("form#order-form") ||
      q("form");

    if (!place) return;

    let box = q("#rk_delivery_box");
    if (!box) {
      box = document.createElement("div");
      box.className = "rkbox";
      box.id = "rk_delivery_box";
      box.innerHTML =
        '<h3 style="margin:0 0 10px">Podrobnosti o doručení</h3>' +
        '<div class="rkrow">' +
        '<div><label for="rkD">Datum doručení</label><input id="rkD" type="date"></div>' +
        '<div><label for="rkT">Čas doručení</label>' +
        '<select id="rkT">' +
        '<option value="">Vyberte čas</option>' +
        "<option>10:00 – 12:00</option>" +
        "<option>12:00 – 14:00</option>" +
        "<option>14:00 – 16:00</option>" +
        "<option>16:00 – 18:00</option>" +
        "</select></div></div>" +
        '<div class="rkhelp" id="rkDelHelp">Uloží se do poznámky objednávky</div>';
      place.appendChild(box);

      const warn = document.createElement("div");
      warn.id = "rkDelWarn";
      warn.style.margin = "10px 0 0";
      warn.style.padding = "10px";
      warn.style.border = "1px solid #f5c2c7";
      warn.style.borderRadius = "10px";
      warn.style.background = "#fff5f5";
      warn.style.display = "none";
      box.appendChild(warn);
    }

    const d = q("#rkD");
    const t = q("#rkT");
    const help = q("#rkDelHelp");
    const warn = q("#rkDelWarn");

    const allOpts = qa("option", t).map((o) => o.textContent);

    // ✅ nejspolehlivější detekce dopravy (active wrapper > fallback :checked)
    const getShipName = () => {
      const a = q("#order-shipping-methods .radio-wrapper.active .shipping-billing-name");
      if (a) return (a.innerText || "").trim();

      const r = q("input[name='shippingId']:checked");
      if (!r) return "";
      const l = q("label[for='" + r.id + "'] .shipping-billing-name");
      return l ? (l.innerText || "").trim() : "";
    };

    const isKuryr = () => getShipName().toLowerCase().indexOf("mykurýr") >= 0;
    const isPickup = () => getShipName().toLowerCase().indexOf("osob") >= 0;

    const setTimeOptions = (futureOnly) => {
      const cur = t.value;
      t.innerHTML = "";
      allOpts.forEach((x) => {
        const o = document.createElement("option");
        o.textContent = x;
        o.value = x === "Vyberte čas" ? "" : x;
        t.appendChild(o);
      });

      if (futureOnly) {
        const m = minsNow();
        qa("option", t).forEach((o) => {
          if (!o.value) return;
          if (startMin(o.value) <= m) o.disabled = true;
        });
      }

      if (cur) {
        const ok = qa("option", t).some((o) => o.value === cur && !o.disabled);
        t.value = ok ? cur : "";
      }
    };

    // restore values
    d.value = sessionStorage.getItem(RK.DD) || tomorrowISO();
    t.value = sessionStorage.getItem(RK.DT) || "";

    const save = () => {
      sessionStorage.setItem(RK.DD, d.value || "");
      sessionStorage.setItem(RK.DT, t.value || "");
    };

    const validate = () => {
      lock.setDelivery(true);

      const td = todayISO();
      const tm = tomorrowISO();

      let date = (d.value || "").trim();
      if (date && date < td) {
        d.value = td;
        date = td;
      }

      warn.style.display = "none";
      warn.textContent = "";
      help.textContent = "Uloží se do poznámky objednávky";
      d.min = td;
      setTimeOptions(false);

      // kurýr = od zítřka a bez víkendů
      if (isKuryr()) {
        help.textContent = "myKurýr s.r.o.: doručení Po–Pá, nejdříve zítra.";
        d.min = tm;

        if (date < tm) {
          d.value = tm;
          date = tm;
        }

        if (date) {
          const wd = new Date(date + "T00:00:00").getDay(); // 6=So,0=Ne
          if (wd === 6 || wd === 0) {
            warn.style.display = "block";
            warn.textContent = "myKurýr s.r.o.: o víkendu nedoručujeme. Vyber pracovní den (Po–Pá).";
            lock.setDelivery(false);
            return;
          }
        }
      }

      // osobní odběr = dnes jen budoucí čas
      if (isPickup()) {
        help.textContent = "Osobní odběr: dnes jen čas v budoucnu.";
        const isToday = date === td;
        setTimeOptions(isToday);

        if (isToday && !t.value) {
          warn.style.display = "block";
          warn.textContent = "Pro dnešní osobní odběr vyber prosím dostupný čas.";
          lock.setDelivery(false);
          return;
        }
      }
    };

    on(d, "input", () => {
      save();
      validate();
    });
    on(d, "change", () => {
      save();
      validate();
    });
    on(t, "change", () => {
      save();
      validate();
    });

    // ✅ spolehlivý update po změně dopravy (radio)
    const shipUpdate = () => {
      setTimeout(validate, 0);
      setTimeout(validate, 30);
      setTimeout(validate, 80);
      setTimeout(validate, 180);
      setTimeout(validate, 350);
      setTimeout(validate, 700);
      setTimeout(validate, 1200);
    };

    const shipHandler = (e) => {
      if (!e || !e.target) return;
      if (e.target.name !== "shippingId") return;
      shipUpdate();
    };

    on(document, "change", shipHandler);
    on(document, "click", shipHandler);
    on(document, "mouseup", shipHandler);
    on(document, "touchend", shipHandler);

    document.addEventListener("shoptet.content.updated", shipUpdate);

    // ✅ MutationObserver – změna .active wrapperu dopravy
    const list = q("#order-shipping-methods");
    if (list && !list.dataset.rkObs) {
      list.dataset.rkObs = "1";
      new MutationObserver(() => shipUpdate()).observe(list, {
        attributes: true,
        subtree: true,
        attributeFilter: ["class"],
      });
    }

    if (window.jQuery) {
      window.jQuery(document).ajaxComplete(() => shipUpdate());
    }

    save();
    validate();
  };

  // ============================
  // ✅ PSČ kontrola – jen pokud doprava NENÍ "Osobní odběr"
  // ============================
  const zipCheck = () => {
    if (!page.step2()) return;

    const bill = q("#billZip");
    const ship = q("#deliveryZip");
    const chk = q("#another-shipping");
    if (!bill) return;

    // ✅ NOVÁ LOGIKA:
    // kontrola PSČ se spustí pouze pokud doprava není "Osobní odběr"
    const needZip = () => {
      const el = q("[data-testid='recapDeliveryMethod']");
      const txt = (el && el.innerText ? el.innerText : "").toLowerCase();
      return txt.indexOf("osobní odběr") < 0;
    };

    let warn = q("#rkZipWarn");
    if (!warn) {
      warn = document.createElement("div");
      warn.id = "rkZipWarn";
      warn.style.margin = "10px 0";
      warn.style.padding = "10px";
      warn.style.border = "1px solid #f5c2c7";
      warn.style.borderRadius = "10px";
      warn.style.background = "#fff5f5";
      warn.style.display = "none";
      warn.textContent = "Doručujeme pouze v Brně (PSČ 60xxx–64xxx). Prosím zkontroluj PSČ.";
    }

    const okZip = (p) => /^(60|61|62|63|64)\d{3}$/.test(String(p || "").replace(/\s/g, ""));
    const activeZip = () => (chk && chk.checked && ship ? ship : bill);

    const place = () => {
      const z = activeZip();
      if (!z) return;
      if (warn.parentNode !== z.parentNode) z.parentNode.appendChild(warn);
    };

    const validate = () => {
      // ✅ osobní odběr => vypnout kontrolu úplně
      if (!needZip()) {
        warn.style.display = "none";
        lock.setZip(true);
        return;
      }

      place();
      const z = activeZip();
      if (!z) return lock.setZip(true);

      const v = (z.value || "").trim();
      if (!v) {
        warn.style.display = "none";
        lock.setZip(true);
        return;
      }

      if (okZip(v)) {
        warn.style.display = "none";
        lock.setZip(true);
      } else {
        warn.style.display = "block";
        lock.setZip(false);
      }
    };

    on(bill, "input", validate);
    on(bill, "change", validate);
    on(ship, "input", validate);
    on(ship, "change", validate);
    on(chk, "change", validate);

    validate();
    setTimeout(validate, 300);
    setTimeout(validate, 800);
    setTimeout(validate, 1400);
  };

  // ============================
  // ✅ Propsání do poznámky objednávky
  // ============================
  const orderNote = () => {
    if (!(page.step1() || page.step2())) return;

    const build = () => {
      const d = (sessionStorage.getItem(RK.DD) || "").trim();
      const t = (sessionStorage.getItem(RK.DT) || "").trim();

      const lines = [];
      if (d || t) {
        lines.push("Doručení:");
        if (d) lines.push("- Datum: " + d);
        if (t) lines.push("- Čas: " + t);
        lines.push("");
      }

      const items = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.indexOf(RK.P) === 0) {
          const id = k.slice(RK.P.length);
          const v = (sessionStorage.getItem(k) || "").trim();
          if (!v) continue;
          const nm = (sessionStorage.getItem(RK.N + id) || ("Produkt " + id)).trim();
          items.push({ nm: nm, v: v });
        }
      }

      if (items.length) {
        lines.push("Vzkazy k položkám:");
        items.forEach((o) => lines.push("- " + o.nm + ": " + o.v));
      }

      return lines.join("\n").trim();
    };

    const apply = () => {
      const ta = q("#remark,textarea[name*='remark'],textarea[name*='note']");
      if (!ta) return;
      if (ta.value && ta.value.trim()) return;

      const s = build();
      if (!s) return;

      ta.value = s;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      ta.dispatchEvent(new Event("change", { bubbles: true }));
    };

    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      apply();
      if (tries > 15) clearInterval(iv);
    }, 250);
  };

  // ============================
  // ✅ Cleanup po objednávce
  // ============================
  const clean = () => {
    if (!location.pathname.includes("/dekujeme")) return;
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (
        k &&
        (k.indexOf(RK.P) === 0 ||
          k.indexOf(RK.N) === 0 ||
          k === RK.DD ||
          k === RK.DT)
      )
        keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  };

  const boot = () => {
    lock.bindHardBlock();
    if (page.prod()) productNote();
    if (page.step1()) deliveryBox();
    if (page.step2()) zipCheck();
    orderNote();
    clean();
    lock.update();
  };

  const start = () => {
    boot();
    setTimeout(boot, 700);
    setTimeout(boot, 1500);
    setTimeout(boot, 2500);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.addEventListener("pageshow", () => setTimeout(boot, 500));
})();
