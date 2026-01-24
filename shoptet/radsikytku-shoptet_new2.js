(() => {
  "use strict";

  // --- DEBUG SECTION START ---
  // Červený box pro vizuální kontrolu.
  const debugBox = document.createElement("div");
  debugBox.style.cssText = "position:fixed;bottom:10px;left:10px;background:red;color:white;padding:15px;z-index:999999;font-weight:bold;border:2px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);";
  debugBox.innerHTML = "RK SCRIPT V4<br>READY";
  if (document.body) document.body.appendChild(debugBox);
  else document.addEventListener("DOMContentLoaded", () => document.body.appendChild(debugBox));
  
  console.error("[RK] START V4 (Clean Boot - New File)");
  // --- DEBUG SECTION END ---

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
    step1: () => q("body") && (q("body").classList.contains("in-krok-1") || q(".ordering-process")),
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
    console.error("[RK] Init Step 1");
    if (debugBox) debugBox.innerHTML += "<br>Step 1 Running";

    const ids = {
      personal: ["26", "29", "25"], // Zde si zkontrolujte ID dopravy
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
      
      if (!container) {
        // Hledáme různé varianty elementů v šabloně
        const anchors = [
            q(".shipping-billing-table"),
            q("#shipping-methods"),
            q(".radio-wrapper"),
            q(".ordering-process-step-1")
        ];
        const anchor = anchors.find(a => a !== null);

        if (!anchor) {
            console.error("[RK] CRITICAL: Anchor not found");
            if (debugBox) debugBox.innerHTML += "<br>ERR: No Anchor";
            return;
        }
        
        container = document.createElement("div");
        container.id = "rk_custom_details";
        
        // Logika vložení
        if (anchor.classList.contains("shipping-billing-table")) {
             anchor.parentNode.insertBefore(container, anchor.nextSibling);
        } else {
             anchor.appendChild(container);
        }
      }

      if (container.dataset.mode === mode) return;

      container.innerHTML = templates[mode] || "";
      container.dataset.mode = mode;
      
      if (debugBox) debugBox.innerHTML = `RK V4<br>Mode: ${mode}`;

      // Obnovení hodnot
      const savedDate = sessionStorage.getItem(RK.DD);
      const savedTime = sessionStorage.getItem(RK.DT);
      const savedName = sessionStorage.getItem(RK.N + "pickup");

      if (savedDate && q(`#${RK.DD}`)) q(`#${RK.DD}`).value = savedDate;
      if (savedTime && q(`#${RK.DT}`)) q(`#${RK.DT}`).value = savedTime;
      if (savedName && q(`#${RK.N}pickup`)) q(`#${RK.N}pickup`).value = savedName;

      // Listenery pro ukládání
      const inputs = qa("#rk_custom_details input");
      inputs.forEach((i) =>
        on(i, "input", (e) => sessionStorage.setItem(e.target.id, e.target.value))
      );
    };

    const handleShippingChange = (source) => {
      // Zpoždění pro AJAX Shoptetu
      setTimeout(() => {
          const currentRadios = qa("input[name='shippingId']");
          const selected = currentRadios.find((r) => r.checked);

          if (!selected) {
            const container = q("#rk_custom_details");
            if (container) container.innerHTML = "";
            return;
          }

          const val = selected.value;
          console.error(`[RK] Selected ID: ${val} (${source})`);
          
          let mode = null;
          if (ids.personal.includes(val)) mode = "personal";
          else if (ids.courier.includes(val)) mode = "courier";

          if (mode) {
             renderDetails(mode);
          } else {
             const container = q("#rk_custom_details");
             if (container) container.innerHTML = "";
             if (debugBox) debugBox.innerHTML = `RK V4<br>ID ${val} (hidden)`;
          }
      }, 200); 
    };

    handleShippingChange("init");

    document.addEventListener("change", (e) => {
      if (e.target && e.target.name === "shippingId") {
        handleShippingChange("change");
      }
    });

    document.addEventListener("shoptet.content.updated", () => {
       handleShippingChange("shoptet_event");
    });

    if (window.jQuery) {
        window.jQuery(document).ajaxComplete((e, xhr, settings) => {
            if (settings.url && settings.url.includes('step2CustomerAjax')) {
                 handleShippingChange("jquery_ajax");
            }
        });
    }
  };

  const build = () => {
    const lines = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(RK.P)) {
          const nm = k.replace(RK.P, "").replace(/_/g, " ");
          lines.push(`${nm}: ${sessionStorage.getItem(k)}`);
      }
    }
    if (lines.length > 0) lines.unshift("--- Poznámky k produktům ---");

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
      if (ta.value && ta.value.trim().length > 10) return; 

      const s = build();
      if (!s) return;

      ta.value = s;
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
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (k.startsWith(RK.P) || k.startsWith(RK.N) || k === RK.DD || k === RK.DT))
        keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  };

  const boot = () => {
    // ZDE JSEM ODSTRANIL CHYBNÉ ŘÁDKY lock.bindHardBlock() a product()
    console.error("[RK] Booting clean...");
    
    if (page.step1()) {
        step1();
    } else if (page.step2()) {
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
