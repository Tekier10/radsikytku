(() => {
  "use strict";
  
  // Kontrolní výpis, že se soubor vůbec načetl
  console.log("[RK] Skript radsikytku-shoptet.js byl načten.");

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
    // Detekce, zda jsme na detailu produktu
    prod: () => q("body") && q("body").classList.contains("in-detail"),
    // Detekce kroku 1 (Doprava a platba)
    step1: () => q("body") && (q("body").classList.contains("in-krok-1") || q(".ordering-process")),
    // Detekce kroku 2 nebo 3
    step2: () =>
      (q("body") && q("body").classList.contains("in-krok-2")) ||
      (q("body") && q("body").classList.contains("in-krok-3")),
  };

  const todayISO = () => new Date().toISOString().slice(0, 10);
  const tomorrowISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const step1 = () => {
    console.log("[RK] Inicializace kroku 1...");

    const ids = {
      personal: ["26", "29", "25"], // ID doprav pro osobní odběr
      courier: ["30"],              // ID doprav pro kurýra
    };

    const templates = {
      courier: `
        <div class="rk-field-group">
           <label>Datum doručení</label>
           <input type="date" id="${RK.DD}" name="${RK.DD}" class="rk-input" min="${tomorrowISO()}" required />
        </div>
        <div class="rk-field-group">
           <label>Čas doručení</label>
           <input type="time" id="${RK.DT}" name="${RK.DT}" class="rk-input" required />
        </div>
        <p class="rk-info">Prosím zadejte preferovaný datum a čas doručení.</p>
      `,
      personal: `
        <div class="rk-field-group">
           <label>Jméno vyzvedávajícího</label>
           <input type="text" id="${RK.N}pickup" name="${RK.N}pickup" class="rk-input" placeholder="Kdo kytku vyzvedne?" />
        </div>
        <div class="rk-field-group">
           <label>Datum vyzvednutí</label>
           <input type="date" id="${RK.DD}" name="${RK.DD}" class="rk-input" min="${todayISO()}" required />
        </div>
        <div class="rk-field-group">
           <label>Čas vyzvednutí</label>
           <input type="time" id="${RK.DT}" name="${RK.DT}" class="rk-input" required />
        </div>
      `,
    };

    const renderDetails = (mode) => {
      let container = q("#rk_custom_details");
      
      // Pokud kontejner neexistuje (Shoptet ho smazal při překreslení), vytvoříme ho znovu
      if (!container) {
        const anchor = q(".shipping-billing-table"); 
        if (!anchor) {
            console.log("[RK] Nenalezen kotevní prvek .shipping-billing-table, zkouším alternativy...");
            // Fallback, kdyby se změnila šablona
            return;
        }
        
        container = document.createElement("div");
        container.id = "rk_custom_details";
        // Vložíme ho za tabulku s dopravou
        anchor.parentNode.insertBefore(container, anchor.nextSibling);
        console.log("[RK] Vytvořen kontejner pro vlastní pole.");
      }

      // Pokud se nemění mód, nic neděláme (abychom nepřepsali rozepsaná data)
      if (container.dataset.mode === mode) return;

      container.innerHTML = templates[mode] || "";
      container.dataset.mode = mode;
      
      console.log(`[RK] Zobrazen formulář pro: ${mode}`);

      // Obnovení hodnot
      const savedDate = sessionStorage.getItem(RK.DD);
      const savedTime = sessionStorage.getItem(RK.DT);
      const savedName = sessionStorage.getItem(RK.N + "pickup");

      if (savedDate && q(`#${RK.DD}`)) q(`#${RK.DD}`).value = savedDate;
      if (savedTime && q(`#${RK.DT}`)) q(`#${RK.DT}`).value = savedTime;
      if (savedName && q(`#${RK.N}pickup`)) q(`#${RK.N}pickup`).value = savedName;

      // Ukládání při psaní
      const inputs = qa("#rk_custom_details input");
      inputs.forEach((i) =>
        on(i, "input", (e) => sessionStorage.setItem(e.target.id, e.target.value))
      );
    };

    const handleShippingChange = (source) => {
      // Malé zpoždění, aby Shoptet stihl překreslit DOM
      setTimeout(() => {
          // Vždy hledáme aktuální radio buttony
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
             // Pokud doprava není v našem seznamu, schováme pole
             const container = q("#rk_custom_details");
             if (container) container.innerHTML = "";
          }
      }, 150); 
    };

    // 1. Spustit hned po načtení
    handleShippingChange("init");

    // 2. Naslouchat na změnu (kliknutí uživatele)
    document.addEventListener("change", (e) => {
      if (e.target && e.target.name === "shippingId") {
        console.log("[RK] Změna dopravy (uživatel).");
        handleShippingChange("change");
      }
    });

    // 3. Naslouchat na překreslení Shoptetem (AJAX)
    document.addEventListener("shoptet.content.updated", () => {
       console.log("[RK] Shoptet aktualizoval obsah (AJAX).");
       handleShippingChange("ajax");
    });
  };

  const build = () => {
    const lines = [];
    
    // Poznámky k produktům (pokud existují v session storage z předchozích kroků)
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(RK.P)) {
          const nm = k.replace(RK.P, "").replace(/_/g, " ");
          lines.push(`${nm}: ${sessionStorage.getItem(k)}`);
      }
    }
    
    if (lines.length > 0) lines.unshift("--- Poznámky k produktům ---");

    // Doprava custom pole
    const dd = sessionStorage.getItem(RK.DD);
    const dt = sessionStorage.getItem(RK.DT);
    const np = sessionStorage.getItem(RK.N + "pickup");

    if (dd || dt || np) {
      if (lines.length > 0) lines.push("");
      lines.push("--- Doplňující info k dopravě ---");
      if (np) lines.push(`Vyzvedne: ${np}`);
      if (dd) lines.push(`Datum: ${dd}`);
      if (dt) lines.push(`Čas: ${dt}`);
    }

    return lines.join("\n").trim();
  };

  const apply = () => {
      const ta = q("#remark,textarea[name*='remark'],textarea[name*='note']");
      if (!ta) return;
      if (ta.value && ta.value.trim().length > 10) return; // Pokud už tam zákazník něco napsal, nepřepisujeme

      const s = build();
      if (!s) return;

      ta.value = s;
      // Vyvolání událostí, aby Shoptet věděl, že se pole změnilo
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      ta.dispatchEvent(new Event("change", { bubbles: true }));
  };
  
  const runApplyLoop = () => {
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      apply();
      if (tries > 10) clearInterval(iv);
    }, 500);
  };

  const clean = () => {
    if (!location.pathname.includes("/dekujeme")) return;
    // Vyčistíme session storage po dokončení objednávky
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (k.startsWith(RK.P) || k.startsWith(RK.N) || k === RK.DD || k === RK.DT))
        keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  };

  const boot = () => {
    // Odstraněno volání lock.bindHardBlock() a product(), které způsobovalo pád
    
    if (page.step1()) {
        step1();
    } else if (page.step2()) {
        // Ve 2. kroku (nebo 3. dle šablony) se data vypíší do poznámky
        runApplyLoop();
    }
    
    clean();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
