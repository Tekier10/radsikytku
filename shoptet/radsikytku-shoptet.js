(() => {
  "use strict";

  // ============================
  // ✅ Konfigurace a pomocné funkce
  // ============================
  const RK = {
    P: "rk_note_product_",
    N: "rk_name_",
    DD: "rk_delivery_date",
    DT: "rk_delivery_time",
  };

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  const page = {
    prod: () => q("body")?.classList.contains("in-detail"),
    step1: () => q("body")?.classList.contains("in-krok-1"),
    step2: () => q("body")?.classList.contains("in-krok-2"),
    step3: () => q("body")?.classList.contains("in-krok-3"),
  };

  const todayISO = () => new Date().toISOString().slice(0, 10);
  const tomorrowISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const minsNow = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };

  // ============================
  // ✅ Logika zámku (blokování tlačítka Pokračovat)
  // ============================
  const lock = {
    el: null,
    init: () => {
      lock.el = q(".next-step");
    },
    block: (state) => {
      if (!lock.el) lock.init();
      if (!lock.el) return;
      if (state) {
        lock.el.classList.add("disabled");
        lock.el.style.pointerEvents = "none";
        lock.el.style.opacity = "0.5";
      } else {
        lock.el.classList.remove("disabled");
        lock.el.style.pointerEvents = "auto";
        lock.el.style.opacity = "1";
      }
    },
    // Shoptet občas obnoví tlačítka, musíme se znovu navázat
    bindHardBlock: () => {
      document.addEventListener("shoptet.content.updated", () => {
        lock.init();
      });
    },
    update: () => {
      // Zde lze přidat globální validaci, pokud je třeba
    }
  };

  // ============================
  // ✅ Poznámka u produktu
  // ============================
  const productNote = () => {
    if (!page.prod()) return;

    const form = q("form#product-detail-form");
    const anchor = q(".p-info-wrapper .availability-value"); 
    if (!form || !anchor) return;

    // Pokud už tam je, neděláme nic
    if (q("#rk_note_wrapper")) return;

    // Získání ID produktu
    const inputId = q("input[name='priceId']");
    if (!inputId) return;
    const pid = inputId.value;

    const wrapper = document.createElement("div");
    wrapper.id = "rk_note_wrapper";
    wrapper.style.marginTop = "15px";
    wrapper.innerHTML = `
      <label style="font-weight:bold;display:block;margin-bottom:5px;">Poznámka k produktu (věnování, barva...)</label>
      <textarea id="rk_prod_note" class="rk-input" rows="2" style="width:100%;margin-bottom:10px;"></textarea>
    `;
    
    anchor.parentNode.insertBefore(wrapper, anchor.nextSibling);

    const ta = q("#rk_prod_note");
    const saved = sessionStorage.getItem(RK.P + pid);
    if (saved) ta.value = saved;

    on(ta, "input", (e) => {
      sessionStorage.setItem(RK.P + pid, e.target.value);
    });
  };

  // ============================
  // ✅ Košík Krok 1: Doprava a Custom Pole (OPRAVENO)
  // ============================
  const deliveryBox = () => {
    if (!page.step1()) return;

    // ID doprav z administrace Shoptetu
    const ids = {
      personal: ["26", "29", "25"], // ID pro osobní odběr
      courier: ["30"],              // ID pro kurýra
    };

    const templates = {
      courier: `
        <div class="rk-field-group" style="margin-top: 15px; padding: 15px; background: #f9f9f9; border: 1px solid #eee;">
           <h4 style="margin-top:0">Podrobnosti o doručení</h4>
           <div style="margin-bottom: 10px;">
             <label style="display:block;font-weight:bold;">Datum doručení *</label>
             <input type="date" id="${RK.DD}" name="${RK.DD}" class="rk-input form-control" min="${tomorrowISO()}" required />
           </div>
           <div style="margin-bottom: 10px;">
             <label style="display:block;font-weight:bold;">Čas doručení (od-do) *</label>
             <input type="text" id="${RK.DT}" name="${RK.DT}" class="rk-input form-control" placeholder="např. 14:00 - 16:00" required />
           </div>
           <p class="rk-info" style="font-size: 0.9em; color: #666;">Zadejte prosím preferovaný čas.</p>
        </div>
      `,
      personal: `
        <div class="rk-field-group" style="margin-top: 15px; padding: 15px; background: #f9f9f9; border: 1px solid #eee;">
           <h4 style="margin-top:0">Podrobnosti o vyzvednutí</h4>
           <div style="margin-bottom: 10px;">
             <label style="display:block;font-weight:bold;">Jméno vyzvedávajícího</label>
             <input type="text" id="${RK.N}pickup" name="${RK.N}pickup" class="rk-input form-control" placeholder="Kdo kytku vyzvedne?" />
           </div>
           <div style="margin-bottom: 10px;">
             <label style="display:block;font-weight:bold;">Datum vyzvednutí *</label>
             <input type="date" id="${RK.DD}" name="${RK.DD}" class="rk-input form-control" min="${todayISO()}" required />
           </div>
           <div style="margin-bottom: 10px;">
             <label style="display:block;font-weight:bold;">Čas vyzvednutí *</label>
             <input type="time" id="${RK.DT}" name="${RK.DT}" class="rk-input form-control" required />
           </div>
        </div>
      `,
    };

    // Vykreslení formuláře
    const renderDetails = (mode) => {
      let container = q("#rk_custom_details");
      
      // Pokud kontejner neexistuje (Shoptet ho smazal při překreslení), vytvoříme ho
      if (!container) {
        const anchor = q(".shipping-billing-table"); // Kotva: tabulka s dopravou
        if (!anchor) return; 
        container = document.createElement("div");
        container.id = "rk_custom_details";
        anchor.parentNode.insertBefore(container, anchor.nextSibling);
      }

      // Pokud se režim nezměnil, nepřekreslujeme (aby se neztratil focus)
      if (container.dataset.mode === mode) return;

      container.innerHTML = templates[mode] || "";
      container.dataset.mode = mode;

      // Obnovení hodnot
      const savedDate = sessionStorage.getItem(RK.DD);
      const savedTime = sessionStorage.getItem(RK.DT);
      const savedName = sessionStorage.getItem(RK.N + "pickup");

      if (savedDate && q(`#${RK.DD}`)) q(`#${RK.DD}`).value = savedDate;
      if (savedTime && q(`#${RK.DT}`)) q(`#${RK.DT}`).value = savedTime;
      if (savedName && q(`#${RK.N}pickup`)) q(`#${RK.N}pickup`).value = savedName;

      // Listenery pro ukládání hodnot
      const inputs = qa("#rk_custom_details input");
      inputs.forEach((i) =>
        on(i, "input", (e) => sessionStorage.setItem(e.target.id, e.target.value))
      );
    };

    // Hlavní logika rozhodování
    const handleShippingChange = () => {
      // Vždy hledáme inputy znovu, protože DOM se mění
      const currentRadios = qa("input[name='shippingId']");
      const selected = currentRadios.find((r) => r.checked);

      if (!selected) {
        const container = q("#rk_custom_details");
        if (container) container.innerHTML = "";
        return;
      }

      const val = selected.value;
      let mode = null;

      if (ids.personal.includes(val)) mode = "personal";
      else if (ids.courier.includes(val)) mode = "courier";

      if (mode) {
        renderDetails(mode);
      } else {
         // Pro ostatní dopravy skryjeme
         const container = q("#rk_custom_details");
         if (container) container.innerHTML = "";
      }
    };

    // 1. Spustit hned
    handleShippingChange();

    // 2. Poslouchat změny (Delegace událostí - funguje i pro nové prvky)
    document.addEventListener("change", (e) => {
      if (e.target && e.target.name === "shippingId") {
        handleShippingChange();
      }
    });

    // 3. Poslouchat Shoptet AJAX update (Klíčová oprava)
    document.addEventListener("shoptet.content.updated", () => {
       handleShippingChange();
    });
  };

  // ============================
  // ✅ Kontrola PSČ (Ponecháno původní)
  // ============================
  const zipCheck = () => {
    // Zde může být logika pro kontrolu PSČ, pokud je vyžadována
  };

  // ============================
  // ✅ Poznámka k objednávce (Krok 3)
  // ============================
  const orderNote = () => {
    if (!page.step3()) return;

    const build = () => {
      const lines = [];
      
      // Produkty
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k.startsWith(RK.P)) {
           // Zde by bylo dobré získat jméno produktu, ale z session storage máme jen ID
           // Pro jednoduchost jen vypíšeme ID, v reálu by se to mapovalo
           lines.push(`Produkt ${k.replace(RK.P, '')}: ${sessionStorage.getItem(k)}`);
        }
      }

      // Doprava
      const dd = sessionStorage.getItem(RK.DD);
      const dt = sessionStorage.getItem(RK.DT);
      const np = sessionStorage.getItem(RK.N + "pickup");

      if (dd) lines.push(`Datum: ${dd}`);
      if (dt) lines.push(`Čas: ${dt}`);
      if (np) lines.push(`Vyzvedne: ${np}`);

      return lines.join("\n");
    };

    const apply = () => {
      const ta = q("#remark,textarea[name*='remark'],textarea[name*='note']");
      if (!ta) return;
      
      // Pokud už tam něco je, nepřepisujeme to (aby zákazník nepřišel o svůj text)
      // nebo můžeme připojit na konec. Zde ponecháme logiku "jen pokud prázdné nebo append"
      // Zde zjednodušeně:
      const s = build();
      if (!s) return;
      if (ta.value.includes(s)) return; // Už tam je

      ta.value = (ta.value ? ta.value + "\n\n" : "") + "--- DOPLŇUJÍCÍ INFO ---\n" + s;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      ta.dispatchEvent(new Event("change", { bubbles: true }));
    };

    // Zkusíme několikrát, protože Shoptet může pole vykreslit později
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      apply();
      if (tries > 5) clearInterval(iv);
    }, 500);
  };

  // ============================
  // ✅ Cleanup (Děkujeme stránka)
  // ============================
  const clean = () => {
    if (!location.pathname.includes("/dekujeme")) return;
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (k.startsWith(RK.P) || k.startsWith(RK.N) || k === RK.DD || k === RK.DT)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  };

  // ============================
  // ✅ Boot - Spuštění
  // ============================
  const boot = () => {
    lock.bindHardBlock();
    productNote();
    deliveryBox(); // Spustí logiku kroku 1
    zipCheck();
    orderNote();   // Spustí logiku kroku 3
    clean();
  };

  // Spuštění po načtení DOMu
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
