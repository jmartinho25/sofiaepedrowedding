// scripts.js — extracted from inline scripts in index.html
// Loaded with `defer` to run after the DOM is parsed.

// Smooth in-page anchor scrolling
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const id=a.getAttribute('href').slice(1);
    const el=document.getElementById(id);
    if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth',block:'start'}) }
  })
});

// IBAN copy-to-clipboard
(function(){
  const btn = document.querySelector('.copy-iban');
  if(!btn) return;
  const ibanTextEl = document.getElementById('ibanText');
  const box = btn.closest('.ibanBox');
  const feedback = box ? box.querySelector('.copy-feedback') : null;

  btn.addEventListener('click', async function(){
    const iban = btn.dataset.iban || (ibanTextEl ? ibanTextEl.textContent.trim() : '');
    try{
      await navigator.clipboard.writeText(iban);
      if(box) box.classList.add('copied');
      if(feedback) feedback.textContent = 'Copiado!';
      // remove feedback after a short delay
      setTimeout(()=>{
        if(box) box.classList.remove('copied');
        if(feedback) feedback.textContent = '';
      }, 1400);
    }catch(err){
      // fallback: select the iban text for manual copy
      if(ibanTextEl){
        const range = document.createRange();
        range.selectNodeContents(ibanTextEl);
        const sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range);
      }
      alert('Não foi possível copiar automaticamente. Selecciona o IBAN e copia manualmente.');
    }
  });
})();

// JS submit handler for Formspree: send via fetch and redirect to obrigado.html
(function(){
  const form = document.getElementById('rsvpForm');
  if(!form) return;

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Enviando…'; }

    const action = form.getAttribute('action') || window.location.href;
    const data = new FormData(form);

    try{
      const res = await fetch(action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      });

      if(res.ok){
        // success - redirect to local thank-you page
        window.location.href = './obrigado.html';
        return;
      }

      // try to get error details from JSON response
      let json = null;
      try{ json = await res.json(); }catch(_){ }
      const msg = (json && (json.error || json.message)) ? (json.error || json.message) : 'Erro ao enviar o formulário.';
      throw new Error(msg);
    }catch(err){
      console.error('Form submit failed', err);
      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = originalText; }
      alert('Falha no envio. Tenta novamente mais tarde ou contacta-nos por email.');
    }
  });
})();

// Reusable carousel builder: creates a simple slider inside a container
(function(){
  function createCarousel({containerId, smallFolder, largeFolder, files, captions, delay=4500}){
    const carousel = document.getElementById(containerId);
    if(!carousel) return;
    const track = carousel.querySelector('.carousel-track');
    let index = 0, timer = null;

    const captionEl = carousel.parentElement.querySelector('.caption');
    const defaultCaption = captionEl ? captionEl.textContent.trim() : '';

    // If files not provided, derive names from captions length (1.webp ... n.webp)
    const fileList = (files && files.length) ? files : captions.map((_,i)=> `${i+1}.webp`);

    fileList.forEach((f,i)=>{
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      slide.setAttribute('role','listitem');

      const picture = document.createElement('picture');
      const source = document.createElement('source');
      source.type = 'image/webp';
      source.srcset = `${smallFolder}/${f} 600w, ${largeFolder}/${f} 1400w`;
      source.sizes = '(max-width:600px) 100vw, 900px';
      picture.appendChild(source);

      const img = document.createElement('img');
      img.alt = captions && captions[i] ? captions[i] : ('Foto ' + (i+1));
      img.loading = 'lazy'; img.decoding = 'async';
      img.src = `${smallFolder}/${f}`;
      img.setAttribute('width','100%');

      img.onerror = function(){
        if(!slide.classList.contains('broken')){
          slide.classList.add('broken');
          const fb = document.createElement('div');
          fb.className = 'slide-fallback';
          fb.textContent = 'Imagem não suportada ou falha ao carregar.';
          slide.appendChild(fb);
        }
      };

      picture.appendChild(img);
      slide.appendChild(picture);
      track.appendChild(slide);
    });

    const slidesCount = fileList.length;

    // update the track position; when `animate` is false we temporarily disable the
    // CSS transition so a wrap jump (last -> first or first -> last) doesn't animate
    // across all slides which looks awkward.
    let started = false;
    let visible = false;

    function play(){
      if(timer) return; // already playing
      timer = setInterval(next, delay);
    }

    function pause(){
      if(timer){ clearInterval(timer); timer = null; }
    }

    function start(){
      if(started) return;
      started = true;
      // ensure we show the current slide immediately when starting
      update();
      // only start autoplay if the carousel is visible
      if(visible) play();
    }

    function update(animate = true){
      if(!animate){
        const prevTrans = track.style.transition;
        track.style.transition = 'none';
        track.style.transform = `translateX(-${index * 100}%)`;
        // force a reflow so the style change takes effect immediately
        track.getBoundingClientRect();
        // restore transition on the next frame
        requestAnimationFrame(()=>{ track.style.transition = prevTrans || ''; });
      }else{
        track.style.transform = `translateX(-${index * 100}%)`;
      }
      if(captionEl){
        const c = (captions && captions[index]) ? captions[index].trim() : '';
        captionEl.textContent = c || defaultCaption;
      }
    }

    function prev(){
      const newIndex = (index - 1 + slidesCount) % slidesCount;
      const wrapping = (index === 0 && newIndex === slidesCount - 1);
      index = newIndex;
      update(!wrapping);
    }

    function next(){
      const newIndex = (index + 1) % slidesCount;
      const wrapping = (index === slidesCount - 1 && newIndex === 0);
      index = newIndex;
      update(!wrapping);
    }

    function resetTimer(){
      if(!started){ start(); return; }
      // restart timer only if currently visible
      pause();
      if(visible) play();
    }

    const prevBtn = carousel.querySelector('.prev');
    const nextBtn = carousel.querySelector('.next');
    if(prevBtn) prevBtn.addEventListener('click', ()=>{ start(); prev(); resetTimer(); });
    if(nextBtn) nextBtn.addEventListener('click', ()=>{ start(); next(); resetTimer(); });

    carousel.addEventListener('keydown', (e)=>{ if(e.key === 'ArrowLeft'){ start(); prev(); resetTimer(); } if(e.key === 'ArrowRight'){ start(); next(); resetTimer(); } });
    carousel.tabIndex = 0;

    // Use IntersectionObserver to track visibility and only autoplay while visible.
    // This ensures the carousel doesn't keep animating in the background.
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(en=>{
        if(en.isIntersecting){
          visible = true;
          if(!started) start();
          else play();
        }else{
          visible = false;
          // pause autoplay when not visible
          pause();
        }
      });
    }, { threshold: 0.25 });
    io.observe(carousel);

    // Also start on pointer/focus interaction in case user interacts before it comes into view
    carousel.addEventListener('pointerenter', ()=>{ visible = true; start(); play(); }, { once:true });
    carousel.addEventListener('focus', ()=>{ visible = true; start(); play(); }, { once:true });

    // ensure initial layout is correct (no auto-advance yet)
    update();
  }

  // Main carousel (existing images)
  const mainFiles = [
    "1.webp","2.webp","3.webp","4.webp","5.webp","6.webp","7.webp","8.webp","9.webp","10.webp",
    "11.webp","12.webp","13.webp","14.webp","15.webp","16.webp","17.webp","18.webp","19.webp","20.webp",
    "21.webp","22.webp","23.webp","24.webp","25.webp","26.webp","27.webp","28.webp","29.webp","30.webp",
    "31.webp","32.webp","33.webp","34.webp","35.webp","36.webp","37.webp","38.webp","39.webp","40.webp",
    "41.webp","42.webp","43.webp","44.webp","45.webp","46.webp","47.webp","48.webp","49.webp","50.webp",
    "51.webp","52.webp","53.webp","54.webp","55.webp","56.webp","57.webp","58.webp","59.webp","60.webp",
    "61.webp","62.webp","63.webp","64.webp","65.webp","66.webp","67.webp","68.webp","69.webp","70.webp",
    "71.webp","72.webp","73.webp","74.webp","75.webp","76.webp","77.webp","78.webp","79.webp","80.webp"
  ];

  const mainCaptions = [
    'Vista para a Acrópole, Atenas, Grécia, Outubro 2025',
    'Parthenon, Atenas, Grécia, Outubro 2025',
    'Voo nos vales da Capadócia, Turquia, Outubro 2025',
    'Trilho pelo Love Valley, Capadócia, Turquia, Outubro 2025',
    'Mesquita Azul, Istambul, Turquia, Outubro 2025',
    '1º almoço na nossa varanda, Braga, Setembro 2025',
    'Pôr do sol nas Salemas, Porto Santo, Julho 2025',
    '1º pequeno-almoço na nossa casinha, Junho 2025',
    '1º aniversário de Noivado na Ribeira, Junho 2025',
    'Visita a Óbidos, regressados de um Joker azarado, Junho 2025',
    'Regressados do casting de um Joker sortudo, Aveiro, Abril 2025',
    'Capitólio, Washington DC, EUA, Março 2025',
    'Washington Monument, Washington DC, EUA, Março 2025',
    'Imitação do pedido de casamento do JFK, Washington DC, EUA, Fevereiro 2025',
    'Leadenhall Market, Londres, Reino Unido, Dezembro 2024',
    'Big Ben e Westminster, Londres, Reino Unido, Dezembro 2024',
    'Primeira árvore de Natal noivos, Novembro 2024',
    'Due deliziosi gelati a Bologna, Itália, Junho 2024',
    'Marina Bay Sands, Singapura, Fevereiro 2024',
    'Gardens by the Bay, Singapura, Fevereiro 2024',
    'Pôr do sol em Railay Beach, Tailândia, Fevereiro 2024',
    'Amanhecer em Khao Sok, ao som dos macacos gibões, Tailândia, Fevereiro 2024',
    'Canoagem no lago Cheow Lan, Tailândia, Fevereiro 2024',
    'Depois de uma aula de culinária, Tailândia, Fevereiro 2024',
    'Colheita de ervas aromáticas, Tailândia, Fevereiro 2024',
    'Crazy 60s no Réveillon 2024, Taipas, Dezembro 2023',
    '1º Natal em Nelas, Viseu, Dezembro 2023',
    'Pedrinho no aniversário da Madrinha, Taipas, Dezembro 2023',
    'Taormina, Itália, Julho 2023',
    'Visita ao Etna, Itália, Julho 2023',
    'Notto, Itália, Julho 2023',
    'Pôr do sol em San Vito Lo Capo, Julho 2023',
    'Ciclovia, Braga, Junho 2023',
    'Porto de Estocolmo, Suécia, Abril 2023',
    'Centro de Estocolmo, Suécia, Abril 2023',
    'Nyhavn de Copenhaga, Dinamarca, Abril 2023',
    'Cerejeiras em flor, Copenhaga, Dinamarca, Abril 2023',
    'Sherlock Holmes e Dr. Watson no Réveillon 2023, Taipas, Dezembro 2022',
    'Aniversário da Sofi no Porto, Dezembro 2022',
    'Primeiro Natal em Braga, Dezembro 2022',
    'Munique, Alemanha, Outubro 2022',
    'No topo dos Alpes Austríacos, Salzburgo, Áustria, Outubro 2022',
    'Na terra de Frozen em Hallstatt, Áustria, Outubro 2022',
    'Brooklyn Bridge, Nova Iorque, EUA, Julho 2022',
    'Central Park, Nova Iorque, EUA, Julho 2022',
    '10 anos de namoro nas vinhas de Ventozelo, Douro, Março 2022',
    '1º jantar na 1ª casa de Braga, Janeiro 2022',
    'Parlamento Europeu, Bruxelas, Bélgica, Dezembro 2021',
    'Canais de Bruges, Bélgica, Dezembro 2021',
    'Pôr do Sol em Leça da Palmeira, Porto, Novembro 2021',
    'Praia da Amália, Odemira, Julho 2021',
    '1ª ida do Rodolfo à Praia, Aveiro, Maio 2021',
    '1º jantar na casa de Gaia, Janeiro 2021',
    'Praia de Altura, Tavira, Agosto 2020',
    'Sofi oficialmente médica, Porto, Agosto 2020',
    'Viana do Castelo, Agosto 2020',
    'Festinha: Sofi já é médica, Taipas, Junho 2020',
    'Hamburgo, Alemanha, Interrail Agosto 2019',
    'Berlim, Alemanha, Interrail Agosto 2019',
    'Cracóvia, Polónia, Interrail Agosto 2019',
    'Praga, República Checa, Interrail Agosto 2019',
    'Viena, Áustria, Interrail Agosto 2019',
    'Bratislava, Eslováquia, Interrail Agosto 2019',
    'Budapeste, Hungria, Interrail Agosto 2019',
    'Ljubliana, Eslovénia, Interrail Agosto 2019',
    'Lago Bled, Eslovénia, Interrail Agosto 2019',
    'Veneza, Itália, Interrail Julho 2019',
    'Innsbruck, Áustria, Interrail Julho 2019',
    'Verona, Itália, Interrail Julho 2019',
    'Florença, Itália, Interrail Julho 2019',
    'Queima das fitas do Porto, Maio 2019',
    'Festa da Joaninha ao som dos ABBA, Braga, Setembro 2018',
    'Berlim, Alemanha, Fevereiro 2018',
    '1ª viagem a dois, Londres, Reino Unido, Maio 2016',
    'Expeliarmus!, Londres, Reino Unido, Maio 2016',
    'Aniversário da Sofi no Porto, Dezembro 2015',
    'Nariz do Mundo, Cabeceiras de Basto, Janeiro 2014',
    'Mais um lanchinho no Avô João, Taipas, Setembro 2013',
    'Jardim Botânico da Universidade de Coimbra, Abril 2013',
    'Festejando 3 meses de namoro, Taipas, Junho 2012'
  ];

  // Second carousel captions (user-provided)
  const captions2 = [
    'Menina desperta','Menino dorminhoco','Menina divertida','Menino assustadiço','Menina toma banho na bacia',
    'Menino molha os pés na piscina','Menina de amarelo com o seu Vô Bastião','Menino de amarelo com o seu Bú Macedo',
    'Menina estática de azul','Menino dinâmico de azul','Menina cautelosa de patins','Menino aventureiro com os mesmos patins',
    'Menina sendo diva na praia','Menino sendo rezingão na praia','Menina alimenta os pombos','Menino alimenta os coelhos',
    'Menina mandona a gritar "Entra na caixa!"','Menino dentro da caixa','Menina coelha branca comilona','Menino Rato Mickey envergonhado',
    'Menina estridente','Menino discreto','Menina que sorri naturalmente','Menino que sorri forçadamente','Menina que já sabe escrever',
    'Menino que nem sabe pôr os óculos','Menina já com estetoscópio ao peito','Menino já rodeado de números','Menina princesa','Menino lutador',
    'Menina capuchinha','Menino feiticeiro','Menina deixa de ser filha única','Menino deixa de ser filho único x 2','Menina espirituosa',
    'Menino curioso','Menina mais certinha da turma','Menino mais mafioso da turma'
  ];

  // initialize both carousels
  createCarousel({
    containerId: 'histCarousel',
    smallFolder: 'fotos_convite_web/small',
    largeFolder: 'fotos_convite_web/large',
    files: mainFiles,
    captions: mainCaptions,
    delay: 4500
  });

  createCarousel({
    containerId: 'histCarousel2',
    // files are stored directly in fotos_convite_carrossel_2/ (no small/large subfolders)
    smallFolder: 'fotos_convite_web/fotos_convite_carrossel_2',
    largeFolder: 'fotos_convite_web/fotos_convite_carrossel_2',
    files: [
      '1.webp','2.webp','3.webp','4.webp','5.webp','6.webp','7.webp','8.webp','9.webp','10.webp',
      '11.webp','12.webp','13.webp','14.webp','15.webp','16.webp','17.webp','18.webp','19.webp','20.webp',
      '21.webp','22.webp','23.webp','24.webp','25.webp','26.webp','27.webp','28.webp','29.webp','30.webp',
      '31.webp','32.webp','33.webp','34.webp','35.webp','36.webp','37.webp','38.webp'
    ],
    captions: captions2,
    delay: 4500
  });

})();

// Reveal-on-scroll (global): observe every element with `.reveal`
// Appear when scrolling down into view, disappear when scrolling up out of view.
(function(){
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Auto-assign `.reveal` to common content blocks unless the author opted out
  // with `.no-reveal`. This enables the effect site-wide without editing HTML.
  const autoSelectors = [
    'section > .wrap',
    '.card:not(.carousel-card)',
    '.moment-grid-item',
  ];
  autoSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      // Skip if the element explicitly opted out, or if it contains a form
      // (we don't want forms to animate by default).
      if(el.classList.contains('reveal') || el.classList.contains('no-reveal')) return;
      if(el.querySelector){
        const forms = el.querySelectorAll('form');
        if(forms.length){
          forms.forEach(f => f.classList.add('no-reveal'));
        }
      }
      el.classList.add('reveal');
    });
  });

  // Collect all revealable elements on the page. Authors can still control
  // exactly where animations run by adding/removing the `reveal` class.
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  if(reveals.length === 0) return;

  // keep pending timers so we can cancel them if the element leaves before the timeout
  const timers = new WeakMap();

  // adaptive stagger: shorter on small screens to keep cascades fast on mobile
  const baseStagger = 40;

  // Make the observer more tolerant: use several thresholds and a small
  // negative bottom rootMargin so elements trigger slightly earlier.
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      const idx = reveals.indexOf(el);
      // use a small stagger for items that live in the same list; if element isn't
      // in the reveals array (shouldn't happen) fall back to 0
      const delay = (idx >= 0 ? Math.max(0, idx) * baseStagger : 0);

      // Consider element visible if either isIntersecting is true or the
      // intersectionRatio is non-zero (covers edge-cases where isIntersecting
      // can be false while a sliver is visible). Use a small tolerance.
      const visibleNow = entry.isIntersecting || (entry.intersectionRatio && entry.intersectionRatio > 0.005);

      if(visibleNow){
        // schedule adding the class with a stagger; store timer so it can be cleared
        const t = setTimeout(()=>{
          el.classList.add('in-view');
          timers.delete(el);
        }, delay);
        timers.set(el, t);
      }else{
        // leaving viewport: cancel any pending add and remove immediately
        const pending = timers.get(el);
        if(pending){ clearTimeout(pending); timers.delete(el); }
        el.classList.remove('in-view');
      }
    });
  }, { threshold: [0, 0.005, 0.02, 0.18], rootMargin: '0px 0px -6% 0px' });

  reveals.forEach(r => obs.observe(r));
})();
