(() => {
  "use strict";

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
    prod: () => q("body") && q("body").classList.contains("in-detail"),
    step1: () => q("body") && q("body").classList.contains("in-krok-1"),
    step2: () =>
      (q("body") && q("body").classList.contains("in-krok-2")) ||
      (q("body") && q("body").classList.contains("in-krok-3")),
    step3: () => q("body") && q("body").classList.contains("in-krok-3"),
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

  const step1 = () => {
    console.log("[RK] Step 1 init"); // Debug

    const ids = {
      personal: ["26", "29", "25"],
      courier: ["30"],
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
      
      // Pokud kontejner neexistuje, vytvoříme ho
      if (!container) {
        // Zkusíme najít tabulku, kam to vložit
        const anchor = q(".shipping-billing-table"); 
        if (!anchor) {
            console.warn("[RK] Anchor .shipping-billing-table nenalezen!");
            return;
        }
        
        container = document.createElement("div");
        container.id = "rk_custom_details";
        // Vložíme za tabulku
        anchor.parentNode.insertBefore(container, anchor.nextSibling);
        console.log("[RK] Kontejner vytvořen");
      }

      // Pokud je tam už správný obsah, nepřekreslujeme (aby nemizela data při psaní)
      if (container.dataset.mode === mode) return;

      console.log(`[RK] Vykresluji template pro: ${mode}`);
      container.innerHTML = templates[mode] || "";
      container.dataset.mode = mode;

      const savedDate = sessionStorage.getItem(RK.DD);
      const savedTime = sessionStorage.getItem(RK.DT);
      const savedName = sessionStorage.getItem(RK.N + "pickup");

      if (savedDate && q(`#${RK.DD}`)) q(`#${RK.DD}`).value = savedDate;
      if (savedTime && q(`#${RK.DT}`)) q(`#${RK.DT}`).value = savedTime;
      if (savedName && q(`#${RK.N}pickup`)) q(`#${RK.N}pickup`).value = savedName;

      const inputs = qa("#rk_custom_details input");
      inputs.forEach((i) =>
        on(i, "input", (e) => sessionStorage.setItem(e.target.id, e.target.value))
      );
    };

    const handleShippingChange = (source = "unknown") => {
      // ZPOŽDĚNÍ: Počkáme 200ms, než Shoptet dokončí překreslování DOMu
      setTimeout(() => {
          const currentRadios = qa("input[name='shippingId']");
          const selected = currentRadios.find((r) => r.checked);

          if (!selected) {
            console.log(`[RK] Event: ${source} - Žádná doprava nevybrána`);
            const container = q("#rk_custom_details");
            if (container) container.innerHTML = "";
            return;
          }

          const val = selected.value;
          console.log(`[RK] Event: ${source} - Vybrána doprava ID: ${val}`);

          let mode = null;
          if (ids.personal.includes(val)) mode = "personal";
          else if (ids.courier.includes(val)) mode = "courier";

          if (mode) {
             renderDetails(mode);
          } else {
             const container = q("#rk_custom_details");
             if (container) container.innerHTML = "";
          }
      }, 200); // 200ms zpoždění pro jistotu
    };

    // Spustit hned
    handleShippingChange("init");

    // Delegace change eventu
    document.addEventListener("change", (e) => {
      if (e.target && e.target.name === "shippingId") {
        handleShippingChange("change");
      }
    });

    // Reakce na AJAX Shoptetu
    document.addEventListener("shoptet.content.updated", () => {
       handleShippingChange("shoptet_updated");
    });
  };

  const step2 = () => {
    // ... (zbytek kódu step2, pokud tam nějaký byl, v původním souboru nic speciálního nebylo, necháváme prázdné nebo podle potřeby)
  };

  const build = () => {
    const lines = [];
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k.startsWith(RK.P)) keys.push({ k, v: sessionStorage.getItem(k) });
    }
    
    // Poznámky k produktům
    if (keys.length) {
      lines.push("--- Poznámky k produktům ---");
      keys.forEach((o) => {
        const nm = o.k.replace(RK.P, "").replace(/_/g, " ");
        lines.push(`${nm}: ${o.v}`);
      });
    }

    // Doprava custom pole
    const dd = sessionStorage.getItem(RK.DD);
    const dt = sessionStorage.getItem(RK.DT);
    const np = sessionStorage.getItem(RK.N + "pickup");

    if (dd || dt || np) {
      lines.push("");
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
      // Pokud už tam něco je, nepřepisujeme to (aby si zákazník nesmazal svou poznámku)
      // Ale pokud je to jen náš text, mohli bychom aktualizovat. Zde necháme logiku: pokud je prázdné.
      if (ta.value && ta.value.trim()) return;

      const s = build();
      if (!s) return;

      ta.value = s;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      ta.dispatchEvent(new Event("change", { bubbles: true }));
  };
  
  // Zkusíme aplikovat poznámku opakovaně, protože textarea se může načíst později
  const runApplyLoop = () => {
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      apply();
      if (tries > 15) clearInterval(iv);
    }, 250);
  };

  const clean = () => {
    if (!location.pathname.includes("/dekujeme")) return;
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (k.startsWith(RK.P) || k.startsWith(RK.N) || k === RK.DD || k === RK.DT))
        keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  };

  const boot = () => {
    // product page logic (pokud nějaká byla v původním souboru, zde byla jen naznačena lock.bindHardBlock, ale ten kód chybí v definici)
    // Předpokládám, že původní kód pro produkty byl v pořádku, zde řešíme hlavně košík.
    
    if (page.step1()) step1();
    if (page.step2()) runApplyLoop();
    clean();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
