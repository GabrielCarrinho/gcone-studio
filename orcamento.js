(function () {
  'use strict';

  const form = document.getElementById('quoteForm');
  if (!form) return;

  const TOTAL_STEPS = 3;
  let currentStep = 1;
  const data = {
    empresa: '', segmento: '', siteAtual: '',
    tipoProjeto: '', conteudo: '', prazo: '',
    nome: '', email: '', telefone: ''
  };

  const steps = Array.from(form.querySelectorAll('.quote-step'));
  const progressFill = document.getElementById('quoteProgressFill');
  const stepLabels = Array.from(document.querySelectorAll('[data-step-label]'));
  const backBtn = document.getElementById('quoteBackBtn');
  const nextBtn = document.getElementById('quoteNextBtn');
  const summaryEl = document.getElementById('quoteSummary');
  const waBtn = document.getElementById('quoteWhatsappBtn');
  const emailBtn = document.getElementById('quoteEmailBtn');

  const WHATSAPP_NUMBER = '5512991415548';
  const EMAIL_ADDRESS = 'contato@gcone.com.br';

  /* ---------------------------------------------------------
     Text inputs — capture into data object as the person types
  --------------------------------------------------------- */
  form.querySelectorAll('input[name]').forEach(input => {
    input.addEventListener('input', () => {
      data[input.name] = input.value.trim();
      updateSummaryAndLinks();
    });
  });

  /* ---------------------------------------------------------
     Pill groups — single-select per field
  --------------------------------------------------------- */
  const segmentoOutroInput = document.getElementById('qSegmentoOutro');

  form.querySelectorAll('.quote-pills').forEach(group => {
    const field = group.getAttribute('data-field');
    group.querySelectorAll('.quote-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const alreadySelected = pill.classList.contains('is-selected');
        group.querySelectorAll('.quote-pill').forEach(p => p.classList.remove('is-selected'));

        if (!alreadySelected) {
          pill.classList.add('is-selected');
          data[field] = pill.textContent.trim();
        } else {
          data[field] = '';
        }

        // "Outro" niche field (segmento only)
        if (segmentoOutroInput && field === 'segmento') {
          const isOtherSelected = !alreadySelected && pill.hasAttribute('data-other');
          segmentoOutroInput.style.display = isOtherSelected ? 'block' : 'none';
          if (isOtherSelected) {
            segmentoOutroInput.focus();
            data.segmento = segmentoOutroInput.value.trim() || 'Outro';
          } else if (!pill.hasAttribute('data-other')) {
            segmentoOutroInput.value = '';
          }
        }

        updateSummaryAndLinks();
      });
    });
  });

  if (segmentoOutroInput) {
    segmentoOutroInput.addEventListener('input', () => {
      data.segmento = segmentoOutroInput.value.trim();
      updateSummaryAndLinks();
    });
  }

  /* ---------------------------------------------------------
     Step navigation
  --------------------------------------------------------- */
  function goToStep(n) {
    if (n < 1 || n > TOTAL_STEPS) return;
    const outgoing = steps[currentStep - 1];
    const incoming = steps[n - 1];

    const showIncoming = () => {
      outgoing.classList.remove('is-active');
      incoming.classList.add('is-active');
      if (window.gsap) {
        gsap.fromTo(incoming, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
      }
    };

    if (window.gsap) {
      gsap.to(outgoing, {
        opacity: 0, y: -10, duration: 0.25, ease: 'power2.in',
        onComplete: showIncoming
      });
    } else {
      showIncoming();
    }

    currentStep = n;
    updateProgress();
    backBtn.classList.toggle('is-visible', currentStep > 1);
    nextBtn.classList.toggle('is-hidden', currentStep === TOTAL_STEPS);

    if (currentStep === TOTAL_STEPS) updateSummaryAndLinks();
  }

  function updateProgress() {
    const pct = (currentStep / TOTAL_STEPS) * 100;
    progressFill.style.width = pct + '%';
    stepLabels.forEach(label => {
      const step = parseInt(label.getAttribute('data-step-label'), 10);
      label.classList.toggle('is-active', step === currentStep);
      label.classList.toggle('is-done', step < currentStep);
    });
  }

  nextBtn.addEventListener('click', () => {
    if (currentStep === 1 && !data.empresa) {
      const input = document.getElementById('qEmpresa');
      nudge(input);
      return;
    }
    goToStep(currentStep + 1);
  });
  backBtn.addEventListener('click', () => goToStep(currentStep - 1));

  function nudge(el) {
    if (window.gsap) {
      gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
    }
    el.focus();
    el.style.borderColor = '#E23A3A';
    setTimeout(() => { el.style.borderColor = ''; }, 1200);
  }

  /* ---------------------------------------------------------
     Natural-language phrase mapping for the generated message
  --------------------------------------------------------- */
  const PHRASES = {
    siteAtual: {
      'Sim, mas preciso melhorar': 'já tenho um site, mas preciso melhorar ele',
      'Não, seria o primeiro': 'ainda não tenho site — seria o primeiro',
      'Só uso redes sociais': 'hoje uso só as redes sociais'
    },
    tipoProjeto: {
      'Landing Page': 'uma landing page',
      'Site Institucional': 'um site institucional',
      'Não sei, preciso de orientação': 'um projeto — ainda não sei bem o formato, preciso de orientação'
    },
    conteudo: {
      'Sim, tudo pronto': 'Já tenho todo o conteúdo pronto (textos, fotos, logo).',
      'Tenho parte': 'Tenho parte do conteúdo pronto.',
      'Preciso de ajuda com isso também': 'Vou precisar de ajuda com o conteúdo também.'
    },
    prazo: {
      'O quanto antes': 'o quanto antes',
      'Sem pressa (1-2 meses)': 'sem pressa, algo entre 1 e 2 meses',
      'Só pesquisando por enquanto': 'ainda só pesquisando, sem prazo definido'
    }
  };

  function buildMessage() {
    const nome = data.nome || '';
    const empresa = data.empresa || '';
    const segmento = data.segmento || '';
    const siteAtualPhrase = PHRASES.siteAtual[data.siteAtual] || '';
    const tipoProjetoPhrase = PHRASES.tipoProjeto[data.tipoProjeto] || 'um projeto de site';
    const conteudoPhrase = PHRASES.conteudo[data.conteudo] || '';
    const prazoPhrase = PHRASES.prazo[data.prazo] || '';

    let msg = 'Olá! ';
    msg += nome ? `Meu nome é ${nome}. ` : 'Gostaria de solicitar um orçamento. ';

    if (empresa) {
      msg += `Tenho o negócio "${empresa}"${segmento ? ' (' + segmento + ')' : ''}`;
      msg += siteAtualPhrase ? `, e ${siteAtualPhrase}.\n\n` : '.\n\n';
    } else if (siteAtualPhrase) {
      msg += `Hoje, ${siteAtualPhrase}.\n\n`;
    } else {
      msg += '\n\n';
    }

    msg += `Gostaria de solicitar um orçamento para ${tipoProjetoPhrase}.`;
    if (prazoPhrase) msg += ` Prazo ideal: ${prazoPhrase}.`;
    msg += '\n\n';
    if (conteudoPhrase) msg += conteudoPhrase + '\n\n';

    if (data.email) msg += `📧 ${data.email}\n`;
    if (data.telefone) msg += `📞 ${data.telefone}\n`;

    msg += '\nPodemos conversar sobre os próximos passos?';
    return msg;
  }

  function updateSummaryAndLinks() {
    const hasAny = Object.values(data).some(v => v);
    if (!hasAny) {
      summaryEl.classList.add('is-empty');
    } else {
      summaryEl.classList.remove('is-empty');
      const parts = [];
      if (data.empresa) parts.push(`<strong>Negócio:</strong> ${escapeHtml(data.empresa)}${data.segmento ? ' — ' + escapeHtml(data.segmento) : ''}`);
      if (data.tipoProjeto) parts.push(`<strong>Projeto:</strong> ${escapeHtml(data.tipoProjeto)}`);
      if (data.prazo) parts.push(`<strong>Prazo:</strong> ${escapeHtml(data.prazo)}`);
      if (data.nome) parts.push(`<strong>Contato:</strong> ${escapeHtml(data.nome)}`);
      summaryEl.innerHTML = parts.length
        ? 'Resumo do seu pedido:<br>' + parts.join('<br>')
        : '';
    }

    const message = buildMessage();
    waBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    const subject = encodeURIComponent('Solicitação de orçamento — ' + (data.empresa || data.nome || 'GC One'));
    const body = encodeURIComponent(message);
    emailBtn.href = `mailto:${EMAIL_ADDRESS}?subject=${subject}&body=${body}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------------------------------------------------
     Required-field check before letting the person head to
     WhatsApp or email — name, email and phone are essential
     for us to actually get back to them.
  --------------------------------------------------------- */
  function validateContactStep() {
    const nomeInput = document.getElementById('qNome');
    const emailInput = document.getElementById('qEmail');
    const telefoneInput = document.getElementById('qTelefone');

    if (!data.nome) { nudge(nomeInput); return false; }
    if (!data.email) { nudge(emailInput); return false; }
    if (!data.telefone) { nudge(telefoneInput); return false; }
    return true;
  }

  [waBtn, emailBtn].forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!validateContactStep()) e.preventDefault();
    });
  });

  /* ---------------------------------------------------------
     Init
  --------------------------------------------------------- */
  updateProgress();
  updateSummaryAndLinks();
  backBtn.classList.remove('is-visible');
})();
