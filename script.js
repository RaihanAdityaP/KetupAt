/* ---------------- STORAGE ---------------- */
  var STORAGE_AVAILABLE = (function(){
    try{ var k="__test__"; localStorage.setItem(k,"1"); localStorage.removeItem(k); return true; }
    catch(e){ return false; }
  })();
  function saveData(key,value){ if(!STORAGE_AVAILABLE)return; try{ localStorage.setItem(key,JSON.stringify(value)); }catch(e){} }
  function loadData(key,fallback){
    if(!STORAGE_AVAILABLE)return fallback;
    try{ var raw=localStorage.getItem(key); if(raw===null)return fallback; return JSON.parse(raw); }
    catch(e){ return fallback; }
  }

  /* ---------------- DATA ---------------- */
  var DEFAULT_NAMES = ["Frisco","Farhan","Fahri","Brian","Raihan","Bagas","Syahrul","Jehes","Abimanyu","Humam","Satria","Naufel","Isma","Detta","Marvel"];
  var DAYS = ["Senin","Selasa","Rabu","Kamis","Jumat"];
  var GOLD = "#c9a25c";
  var ADMIN_USER = "admin";
  var ADMIN_PASS = "WheniAdmin123#";

  /* WHEEL_NAMES: daftar khusus roda pemimpin */
  var WHEEL_NAMES = loadData("app_wheel_names", DEFAULT_NAMES.slice());
  var WHEEL_POOL  = loadData("app_wheelPool", WHEEL_NAMES.slice());
  var lastWinner  = loadData("app_lastWinner", null);
  /* pastikan pool hanya berisi nama yg ada di WHEEL_NAMES */
  WHEEL_POOL = WHEEL_POOL.filter(function(n){ return WHEEL_NAMES.indexOf(n) !== -1; });

  /* NAMES: daftar untuk Piket & Tempat Duduk */
  var NAMES = loadData("app_names", DEFAULT_NAMES.slice());

  var isAdmin = false;
  var wheelRotation = 0;
  var spinning = false;

  /* ---------------- UTILS ---------------- */
  function shuffleArray(arr){
    var a=arr.slice();
    for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=a[i];a[i]=a[j];a[j]=tmp; }
    return a;
  }
  function hashString(str){
    var hash=0;
    for(var i=0;i<str.length;i++){ hash=(hash<<5)-hash+str.charCodeAt(i); hash|=0; }
    return Math.abs(hash);
  }
  function nameColor(name){
    var h=hashString(name); var hue=h%360; var sat=35+(h%18); var light=44+((h>>3)%14);
    return "hsl("+hue+","+sat+"%,"+light+"%)";
  }
  function fadeThenRun(selector,fn,stagger){
    var els=document.querySelectorAll(selector);
    els.forEach(function(el){ el.classList.add("fading"); });
    setTimeout(function(){
      fn();
      els.forEach(function(el,i){ setTimeout(function(){ el.classList.remove("fading"); },i*stagger); });
    },300);
  }

  /* ---------------- TABS ---------------- */
  function initTabs(){
    var btns=document.querySelectorAll(".tab-btn");
    btns.forEach(function(btn){
      btn.addEventListener("click",function(){
        btns.forEach(function(b){ b.classList.remove("active"); });
        btn.classList.add("active");
        var target=btn.getAttribute("data-tab");
        document.querySelectorAll(".panel").forEach(function(p){
          p.classList.toggle("active",p.getAttribute("data-panel")===target);
        });
      });
    });
  }

  /* ---------------- MODAL HELPERS ---------------- */
  function openModal(id){ document.getElementById(id).classList.add("show"); }
  function closeModal(id){ document.getElementById(id).classList.remove("show"); }
  document.querySelectorAll(".modal-overlay").forEach(function(overlay){
    overlay.addEventListener("click",function(e){ if(e.target===overlay){ overlay.classList.remove("show"); } });
  });
  document.getElementById("loginCloseX").addEventListener("click",function(){ closeModal("loginModal"); });
  document.getElementById("manageCloseX").addEventListener("click",function(){ closeModal("manageModal"); });
  document.getElementById("manageWheelCloseX").addEventListener("click",function(){ closeModal("manageWheelModal"); });

  /* ---------------- AUTH ---------------- */
  function updateAuthUI(){
    var badge=document.getElementById("authBadge");
    var hint=document.getElementById("authHint");
    if(isAdmin){
      badge.textContent="Admin"; badge.classList.add("admin");
      hint.textContent="Bisa mengacak & mengelola orang";
      document.getElementById("loginBtn").style.display="none";
      document.getElementById("manageWheelBtn").style.display="";
      document.getElementById("manageBtn").style.display="";
      document.getElementById("logoutBtn").style.display="";
    } else {
      badge.textContent="Tamu"; badge.classList.remove("admin");
      hint.textContent="Hanya bisa melihat";
      document.getElementById("loginBtn").style.display="";
      document.getElementById("manageWheelBtn").style.display="none";
      document.getElementById("manageBtn").style.display="none";
      document.getElementById("logoutBtn").style.display="none";
    }
    document.getElementById("spinBtn").disabled=!isAdmin||WHEEL_POOL.length===0;
    document.getElementById("resetWheelBtn").disabled=!isAdmin;
    document.getElementById("seatShuffleBtn").disabled=!isAdmin;
    document.getElementById("dutyShuffleBtn").disabled=!isAdmin;
    renderPoolManage();
  }

  document.getElementById("loginBtn").addEventListener("click",function(){
    document.getElementById("loginUser").value="";
    document.getElementById("loginPass").value="";
    document.getElementById("loginError").textContent="";
    openModal("loginModal");
  });
  document.getElementById("loginCancelBtn").addEventListener("click",function(){ closeModal("loginModal"); });
  function attemptLogin(){
    var u=document.getElementById("loginUser").value.trim();
    var p=document.getElementById("loginPass").value;
    if(u===ADMIN_USER&&p===ADMIN_PASS){ isAdmin=true; updateAuthUI(); closeModal("loginModal"); }
    else{ document.getElementById("loginError").textContent="Username atau password salah."; }
  }
  document.getElementById("loginSubmitBtn").addEventListener("click",attemptLogin);
  document.getElementById("loginPass").addEventListener("keydown",function(e){ if(e.key==="Enter"){ attemptLogin(); } });
  document.getElementById("logoutBtn").addEventListener("click",function(){ isAdmin=false; updateAuthUI(); });

  /* ======================================================
     MANAGE WHEEL (roda pemimpin) — TERPISAH dari NAMES
     ====================================================== */
  document.getElementById("manageWheelBtn").addEventListener("click",function(){
    renderWheelPeopleList();
    fillBulkWheelTextarea();
    openModal("manageWheelModal");
  });
  document.getElementById("manageWheelCloseBtn").addEventListener("click",function(){ closeModal("manageWheelModal"); });

  function fillBulkWheelTextarea(){
    document.getElementById("bulkWheelNamesInput").value=WHEEL_NAMES.join("\n");
  }

  function renderWheelPeopleList(){
    var list=document.getElementById("wheelPeopleList");
    if(WHEEL_NAMES.length===0){
      list.innerHTML='<p class="status-text" style="text-align:left;">Belum ada orang di roda.</p>'; return;
    }
    list.innerHTML=WHEEL_NAMES.map(function(name,i){
      return '<div class="people-row"><span class="avatar avatar-sm" style="--avatar-color:'+nameColor(name)+'">'+name.charAt(0)+'</span><span class="people-name">'+name+'</span><button class="remove-btn" data-wheel-remove="'+i+'" type="button">&times;</button></div>';
    }).join("");
    list.querySelectorAll("[data-wheel-remove]").forEach(function(btn){
      btn.addEventListener("click",function(){
        var idx=parseInt(btn.getAttribute("data-wheel-remove"),10);
        removeWheelPersonAt(idx);
        renderWheelPeopleList();
        afterWheelRosterChange();
      });
    });
  }
  function removeWheelPersonAt(idx){
    var removedName=WHEEL_NAMES[idx];
    WHEEL_NAMES.splice(idx,1);
    var wIdx=WHEEL_POOL.indexOf(removedName);
    if(wIdx!==-1){ WHEEL_POOL.splice(wIdx,1); }
    if(lastWinner===removedName){ lastWinner=null; saveData("app_lastWinner",null); }
    saveData("app_wheel_names",WHEEL_NAMES);
    saveData("app_wheelPool",WHEEL_POOL);
  }

  document.getElementById("addWheelNameBtn").addEventListener("click",function(){
    var input=document.getElementById("newWheelNameInput");
    var name=input.value.trim();
    if(!name||WHEEL_NAMES.indexOf(name)!==-1){ input.value=""; return; }
    WHEEL_NAMES.push(name);
    WHEEL_POOL.push(name);
    saveData("app_wheel_names",WHEEL_NAMES);
    saveData("app_wheelPool",WHEEL_POOL);
    input.value="";
    renderWheelPeopleList();
    afterWheelRosterChange();
  });
  document.getElementById("newWheelNameInput").addEventListener("keydown",function(e){
    if(e.key==="Enter"){ document.getElementById("addWheelNameBtn").click(); }
  });

  document.getElementById("applyBulkWheelBtn").addEventListener("click",function(){
    var raw=document.getElementById("bulkWheelNamesInput").value;
    var lines=raw.split("\n").map(function(s){ return s.trim(); }).filter(function(s){ return s.length>0; });
    var seen={};var unique=[];
    lines.forEach(function(n){ if(!seen[n]){ seen[n]=true; unique.push(n); } });
    if(unique.length===0)return;
    WHEEL_NAMES=unique;
    WHEEL_POOL=WHEEL_NAMES.slice();
    lastWinner=null;
    saveData("app_wheel_names",WHEEL_NAMES);
    saveData("app_wheelPool",WHEEL_POOL);
    saveData("app_lastWinner",null);
    renderWheelPeopleList();
    fillBulkWheelTextarea();
    afterWheelRosterChange();
  });

  function afterWheelRosterChange(){
    wheelRotation=0;
    var wheelEl=document.getElementById("wheelInner");
    wheelEl.style.transition="none";
    wheelEl.style.transform="rotate(0deg)";
    drawWheel();
    if(lastWinner){ showWheelResult(lastWinner); } else { clearWheelResult(); }
    updateWheelMeta();
    updateWheelStatusText();
    updateAuthUI();
  }

  /* ======================================================
     MANAGE PEOPLE (piket & tempat duduk) — TERPISAH dari WHEEL_NAMES
     ====================================================== */
  document.getElementById("manageBtn").addEventListener("click",function(){ renderPeopleList(); fillBulkTextarea(); openModal("manageModal"); });
  document.getElementById("manageCloseBtn").addEventListener("click",function(){ closeModal("manageModal"); });

  function fillBulkTextarea(){ document.getElementById("bulkNamesInput").value=NAMES.join("\n"); }

  function renderPeopleList(){
    var list=document.getElementById("peopleList");
    if(NAMES.length===0){
      list.innerHTML='<p class="status-text" style="text-align:left;">Belum ada orang.</p>'; return;
    }
    list.innerHTML=NAMES.map(function(name,i){
      return '<div class="people-row"><span class="avatar avatar-sm" style="--avatar-color:'+nameColor(name)+'">'+name.charAt(0)+'</span><span class="people-name">'+name+'</span><button class="remove-btn" data-remove-index="'+i+'" type="button">&times;</button></div>';
    }).join("");
    list.querySelectorAll("[data-remove-index]").forEach(function(btn){
      btn.addEventListener("click",function(){
        var idx=parseInt(btn.getAttribute("data-remove-index"),10);
        removePersonAt(idx);
        renderPeopleList();
        afterRosterChange();
      });
    });
  }
  function removePersonAt(idx){
    NAMES.splice(idx,1);
    saveData("app_names",NAMES);
  }
  document.getElementById("addNameBtn").addEventListener("click",function(){
    var input=document.getElementById("newNameInput");
    var name=input.value.trim();
    if(!name||NAMES.indexOf(name)!==-1){ input.value=""; return; }
    NAMES.push(name);
    saveData("app_names",NAMES);
    input.value="";
    renderPeopleList();
    afterRosterChange();
  });
  document.getElementById("newNameInput").addEventListener("keydown",function(e){
    if(e.key==="Enter"){ document.getElementById("addNameBtn").click(); }
  });
  document.getElementById("applyBulkBtn").addEventListener("click",function(){
    var raw=document.getElementById("bulkNamesInput").value;
    var lines=raw.split("\n").map(function(s){ return s.trim(); }).filter(function(s){ return s.length>0; });
    var seen={};var unique=[];
    lines.forEach(function(n){ if(!seen[n]){ seen[n]=true; unique.push(n); } });
    if(unique.length===0)return;
    NAMES=unique;
    saveData("app_names",NAMES);
    renderPeopleList();
    fillBulkTextarea();
    afterRosterChange();
  });

  function afterRosterChange(){
    /* hanya reset seat & duty, TIDAK menyentuh wheel */
    placeholderSeats(); placeholderDuty();
    saveData("app_seating",null); saveData("app_duty",null);
  }

  /* ---------------- CELEBRATION POPUP + CONFETTI ---------------- */
  var confettiCanvas = document.getElementById("confettiCanvas");
  var confettiCtx = confettiCanvas.getContext("2d");
  var confettiParticles = [];
  var confettiRaf = null;

  var CELEB_MESSAGES = [
    "Selamat ya, kamu terpilih jadi pemimpin hari ini! 🎉",
    "Wah, beruntung banget! Pimpin kelas dengan semangat! 🚀",
    "Selamat! Hari ini kamu yang pegang komando! ✨",
    "Yeay! Giliran kamu jadi pemimpin! Jangan malu-malu! 🔥",
    "Kamu terpilih! Tunjukkan yang terbaik hari ini! 💪",
    "Congrats! Kepemimpinan sejati dimulai dari sini! 🌟",
    "Hore! Kamu yang beruntung hari ini! Semangat ya! 🎊",
  ];

  function resizeConfettiCanvas(){
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  resizeConfettiCanvas();
  window.addEventListener("resize", resizeConfettiCanvas);

  function spawnConfetti(){
    confettiParticles = [];
    var colors = ["#c9a25c","#e0c389","#e76f51","#f4a261","#e9c46a","#ffffff","#ffd166","#ef476f","#06d6a0"];
    for(var i = 0; i < 140; i++){
      confettiParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight - window.innerHeight,
        w: 6 + Math.random() * 8,
        h: 10 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.18,
        vx: (Math.random() - 0.5) * 3,
        vy: 2.5 + Math.random() * 3.5,
        opacity: 1,
      });
    }
  }

  function animateConfetti(){
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    var alive = false;
    confettiParticles.forEach(function(p){
      p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed;
      if(p.y > window.innerHeight * 0.6){ p.opacity -= 0.025; }
      if(p.opacity > 0){
        alive = true;
        confettiCtx.save();
        confettiCtx.globalAlpha = Math.max(0, p.opacity);
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rot);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        confettiCtx.restore();
      }
    });
    if(alive){ confettiRaf = requestAnimationFrame(animateConfetti); }
    else{ confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height); }
  }

  function stopConfetti(){
    if(confettiRaf){ cancelAnimationFrame(confettiRaf); confettiRaf = null; }
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiParticles = [];
  }

  function showCelebration(name){
    var el = document.getElementById("celebModal");
    var av = document.getElementById("celebAvatar");
    var nm = document.getElementById("celebName");
    var ms = document.getElementById("celebMsg");
    av.textContent = name.charAt(0);
    av.style.setProperty("--celeb-color", nameColor(name));
    nm.textContent = name;
    ms.textContent = CELEB_MESSAGES[Math.floor(Math.random() * CELEB_MESSAGES.length)];
    el.classList.add("show");
    stopConfetti();
    spawnConfetti();
    animateConfetti();
  }

  document.getElementById("celebCloseBtn").addEventListener("click", function(){
    document.getElementById("celebModal").classList.remove("show");
    stopConfetti();
  });
  document.getElementById("celebModal").addEventListener("click", function(e){
    if(e.target === this){ this.classList.remove("show"); stopConfetti(); }
  });

  /* ---------------- WHEEL (PEMIMPIN) — pakai WHEEL_NAMES & WHEEL_POOL ---------------- */
  function drawWheel(){
    var canvas=document.getElementById("wheelCanvas");
    var ctx=canvas.getContext("2d");
    var n=WHEEL_POOL.length;
    var size=canvas.width;
    var cx=size/2,cy=size/2,radius=size/2-4;
    ctx.clearRect(0,0,size,size);

    if(n===0){
      ctx.beginPath(); ctx.arc(cx,cy,radius,0,Math.PI*2);
      ctx.fillStyle="#241a12"; ctx.fill();
      ctx.fillStyle="rgba(232,221,200,.4)"; ctx.font="13px Jost, sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(WHEEL_NAMES.length===0?"Belum ada orang":"Semua sudah terpilih",cx,cy);
      ctx.beginPath(); ctx.arc(cx,cy,16,0,Math.PI*2);
      ctx.fillStyle="#1c130d"; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle=GOLD; ctx.stroke();
      return;
    }

    var sliceAngle=(Math.PI*2)/n;
    for(var i=0;i<n;i++){
      var start=i*sliceAngle-Math.PI/2;
      var end=start+sliceAngle;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,radius,start,end); ctx.closePath();
      ctx.fillStyle=nameColor(WHEEL_POOL[i]); ctx.fill();
      ctx.strokeStyle="rgba(21,15,12,0.6)"; ctx.lineWidth=1.5; ctx.stroke();

      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(start+sliceAngle/2);
      ctx.textAlign="right"; ctx.textBaseline="middle"; ctx.fillStyle="#1a1410";
      var fontSize=Math.max(9,Math.min(13,150/n));
      ctx.font="600 "+fontSize+"px Jost, sans-serif";
      var label=WHEEL_POOL[i];
      var maxW=radius-16;
      while(ctx.measureText(label).width>maxW&&label.length>2){ label=label.slice(0,-1); }
      if(label!==WHEEL_POOL[i]){ label=label+"."; }
      ctx.fillText(label,radius-8,0);
      ctx.restore();
    }

    ctx.beginPath(); ctx.arc(cx,cy,16,0,Math.PI*2);
    ctx.fillStyle="#1c130d"; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle=GOLD; ctx.stroke();
  }

  function showWheelResult(name){
    var resultEl=document.getElementById("wheelResult");
    resultEl.innerHTML='<span class="avatar avatar-lg" style="--avatar-color:'+nameColor(name)+'">'+name.charAt(0)+'</span><span class="leader-name">'+name+'</span>';
    resultEl.classList.add("show");
  }
  function clearWheelResult(){
    var resultEl=document.getElementById("wheelResult");
    resultEl.innerHTML=""; resultEl.classList.remove("show");
  }
  function updateWheelStatusText(){
    var statusEl=document.getElementById("wheelStatus");
    if(WHEEL_NAMES.length===0){ statusEl.textContent="Tambahkan orang via Kelola Roda"; return; }
    if(WHEEL_POOL.length===0){ statusEl.textContent="Semua orang sudah terpilih, klik Reset Roda"; return; }
    statusEl.textContent=lastWinner?"Pemimpin terpilih":"Belum diputar";
  }
  function updateWheelMeta(){
    document.getElementById("wheelMetaCount").textContent=WHEEL_POOL.length+" dari "+WHEEL_NAMES.length+" orang tersisa di roda";
    var picked=WHEEL_NAMES.filter(function(n){ return WHEEL_POOL.indexOf(n)===-1; });
    document.getElementById("wheelPickedList").textContent=picked.length>0?("Sudah terpilih: "+picked.join(", ")):"";
  }

  function renderPoolManage(){
    var wrap=document.getElementById("poolManage");
    if(!isAdmin||WHEEL_POOL.length===0){ wrap.innerHTML=""; return; }
    var chips=WHEEL_POOL.map(function(name,i){
      return '<span class="pool-chip"><span>'+name+'</span><button class="remove-btn" data-pool-remove-index="'+i+'" type="button" title="Keluarkan dari roda">&times;</button></span>';
    }).join("");
    wrap.innerHTML='<p class="pool-manage-label">Keluarkan dari roda (misal lagi absen)</p><div class="pool-chip-wrap">'+chips+'</div>';
    wrap.querySelectorAll("[data-pool-remove-index]").forEach(function(btn){
      btn.addEventListener("click",function(){
        if(spinning)return;
        var idx=parseInt(btn.getAttribute("data-pool-remove-index"),10);
        WHEEL_POOL.splice(idx,1);
        saveData("app_wheelPool",WHEEL_POOL);
        drawWheel(); updateWheelMeta(); updateWheelStatusText();
        renderPoolManage(); updateAuthUI();
      });
    });
  }

  function spinWheel(){
    if(spinning||!isAdmin)return;
    var n=WHEEL_POOL.length;
    if(n===0)return;
    spinning=true;
    document.getElementById("spinBtn").disabled=true;
    document.getElementById("resetWheelBtn").disabled=true;

    var sliceAngle=360/n;
    var winnerIndex=Math.floor(Math.random()*n);
    var winnerName=WHEEL_POOL[winnerIndex];
    var centerAngle=(winnerIndex+0.5)*sliceAngle;
    var targetMod=(360-centerAngle+360)%360;
    var currentMod=wheelRotation%360;
    var delta=(targetMod-currentMod+360)%360;
    var totalRotation=wheelRotation+delta+5*360;

    var wheelEl=document.getElementById("wheelInner");
    wheelEl.style.transition="transform 3.2s cubic-bezier(.17,.67,.32,1.0)";
    wheelEl.style.transform="rotate("+totalRotation+"deg)";
    wheelRotation=totalRotation;

    clearWheelResult();
    document.getElementById("wheelStatus").textContent="Memutar...";

    setTimeout(function(){
      spinning=false;
      WHEEL_POOL.splice(winnerIndex,1);
      lastWinner=winnerName;
      saveData("app_wheelPool",WHEEL_POOL);
      saveData("app_lastWinner",lastWinner);
      drawWheel(); updateWheelMeta();
      showWheelResult(winnerName);
      updateWheelStatusText(); updateAuthUI();
      showCelebration(winnerName);
    },3300);
  }
  document.getElementById("spinBtn").addEventListener("click",spinWheel);

  document.getElementById("resetWheelBtn").addEventListener("click",function(){
    if(!isAdmin)return;
    WHEEL_POOL=WHEEL_NAMES.slice();
    lastWinner=null;
    saveData("app_wheelPool",WHEEL_POOL);
    saveData("app_lastWinner",null);
    wheelRotation=0;
    var wheelEl=document.getElementById("wheelInner");
    wheelEl.style.transition="none";
    wheelEl.style.transform="rotate(0deg)";
    drawWheel(); clearWheelResult(); updateWheelMeta(); updateWheelStatusText(); updateAuthUI();
  });

  /* ---------------- PIKET (pakai NAMES) ---------------- */
  function generateDuty(){
    var shuffled=shuffleArray(NAMES);
    var result={};
    DAYS.forEach(function(d){ result[d]=[]; });
    shuffled.forEach(function(name,i){ result[DAYS[i%DAYS.length]].push(name); });
    return result;
  }
  function renderDuty(data){
    DAYS.forEach(function(day){
      var el=document.querySelector('[data-duty="'+day+'"]');
      var people=data[day];
      if(!people||people.length===0){
        el.innerHTML='<span class="empty-icon">&times;</span><span class="seat-name muted">Kosong</span>'; return;
      }
      el.innerHTML=people.map(function(name){
        return '<div class="duty-person"><span class="avatar avatar-sm" style="--avatar-color:'+nameColor(name)+'">'+name.charAt(0)+'</span><span class="duty-name">'+name+'</span></div>';
      }).join("");
    });
    document.getElementById("dutyStatus").textContent=NAMES.length+" orang dibagi ke 5 hari";
  }
  function placeholderDuty(){
    DAYS.forEach(function(day){
      var el=document.querySelector('[data-duty="'+day+'"]');
      el.innerHTML='<span class="empty-icon empty-icon-lg">?</span><span class="seat-name muted">Belum diacak</span>';
    });
    document.getElementById("dutyStatus").textContent="Belum diacak";
  }
  document.getElementById("dutyShuffleBtn").addEventListener("click",function(){
    if(!isAdmin)return;
    fadeThenRun("[data-duty]",function(){
      var duty=generateDuty(); renderDuty(duty); saveData("app_duty",duty);
    },50);
  });

  /* ---------------- TEMPAT DUDUK (pakai NAMES) ---------------- */
  function generateSeating(){
    var totalSeats=16;
    var pool=shuffleArray(NAMES);
    var seated=pool.slice(0,totalSeats);
    while(seated.length<totalSeats){ seated.push(null); }
    return shuffleArray(seated);
  }
  function renderSeats(seats){
    var seatEls=document.querySelectorAll(".seat");
    seatEls.forEach(function(el,i){
      var name=seats[i];
      if(name){
        el.style.setProperty("--avatar-color",nameColor(name));
        el.innerHTML='<span class="avatar">'+name.charAt(0)+'</span><span class="seat-name">'+name+'</span>';
      } else {
        el.style.removeProperty("--avatar-color");
        el.innerHTML='<span class="empty-icon">&times;</span><span class="seat-name muted">Kosong</span>';
      }
    });
    var filled=seats.filter(Boolean).length;
    var unseated=Math.max(0,NAMES.length-16);
    var text=filled+" dari 16 kursi terisi";
    if(unseated>0){ text+=" ("+unseated+" orang belum kebagian kursi)"; }
    document.getElementById("seatCounter").textContent=text;
  }
  function placeholderSeats(){
    document.querySelectorAll(".seat").forEach(function(el){
      el.style.removeProperty("--avatar-color");
      el.innerHTML='<span class="empty-icon">?</span><span class="seat-name muted">&mdash;</span>';
    });
    document.getElementById("seatCounter").textContent="Belum diacak";
  }
  document.getElementById("seatShuffleBtn").addEventListener("click",function(){
    if(!isAdmin)return;
    fadeThenRun(".seat",function(){
      var seats=generateSeating(); renderSeats(seats); saveData("app_seating",seats);
    },18);
  });

  /* ---------------- INIT ---------------- */
  initTabs();

  var savedSeating=loadData("app_seating",null);
  var savedDuty=loadData("app_duty",null);
  if(savedSeating){ renderSeats(savedSeating); } else { placeholderSeats(); }
  if(savedDuty){ renderDuty(savedDuty); } else { placeholderDuty(); }

  drawWheel();
  if(lastWinner&&WHEEL_NAMES.indexOf(lastWinner)!==-1){ showWheelResult(lastWinner); } else { lastWinner=null; clearWheelResult(); }
  updateWheelMeta();
  updateWheelStatusText();
  updateAuthUI();