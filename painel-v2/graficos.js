/* Gráficos SVG acessíveis para contagens em FAIXAS (mínimo–máximo) e indicadores de cobertura.
   A parte sólida vai até o mínimo garantido; a parte clara mostra a incerteza até o máximo da faixa.
   Nenhum valor exato é inventado: o rótulo é sempre a faixa publicada. */
(function (raiz) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  function el(nome, atributos = {}, filhos = []) {
    const e = document.createElementNS(NS, nome);
    Object.entries(atributos).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== false) e.setAttribute(k, String(v));
    });
    filhos.flat().forEach(f => {
      if (f !== null && f !== undefined && f !== false) {
        e.appendChild(typeof f === 'string' ? document.createTextNode(f) : f);
      }
    });
    return e;
  }
  const rotuloFaixa = (min, max) => (min === max ? String(min) : min + '–' + max);

  /* 1. Barras horizontais em faixa: [{rotulo, min, max, cor, estado: 'ok'|'sem-dado', nota, valor}] */
  function barrasFaixa(itens, { titulo, descricao, aoClicar } = {}) {
    const largura = 540, alturaLinha = 40, margemRotulo = 176, margemValor = 100;
    const altura = Math.max(1, itens.length) * alturaLinha + 14;
    const maximo = Math.max(1, ...itens.filter(i => i.estado === 'ok').map(i => i.max));
    const util = largura - margemRotulo - margemValor;
    const idTitulo = 'g' + Math.random().toString(36).slice(2, 9);
    const svg = el('svg', { viewBox: `0 0 ${largura} ${altura}`, width: largura, role: 'img', class: 'grafico', 'aria-labelledby': idTitulo });
    svg.appendChild(el('title', { id: idTitulo }, [titulo + (descricao ? '. ' + descricao : '')]));
    itens.forEach((item, i) => {
      const y = 6 + i * alturaLinha;
      const grupo = el('g', { class: 'linha-grafico' + (aoClicar && item.estado === 'ok' ? ' clicavel' : '') });
      grupo.appendChild(el('text', { x: margemRotulo - 10, y: y + 22, 'text-anchor': 'end', class: 'rotulo-eixo' }, [item.rotulo]));
      if (item.estado === 'ok') {
        const wMin = util * item.min / maximo, wMax = util * item.max / maximo;
        grupo.appendChild(el('rect', { x: margemRotulo, y: y + 6, width: Math.max(wMax, 2), height: 22, rx: 4, class: 'barra-incerteza', style: `--cor:${item.cor}` }));
        grupo.appendChild(el('rect', { x: margemRotulo, y: y + 6, width: Math.max(wMin, 2), height: 22, rx: 4, class: 'barra-solida', style: `--cor:${item.cor}` }));
        grupo.appendChild(el('text', { x: margemRotulo + Math.max(wMax, 2) + 8, y: y + 22, class: 'rotulo-valor' }, [rotuloFaixa(item.min, item.max)]));
        grupo.appendChild(el('title', {}, [`${item.rotulo}: ${rotuloFaixa(item.min, item.max)}${item.nota ? ' — ' + item.nota : ''}`]));
        if (aoClicar) {
          grupo.setAttribute('tabindex', '0');
          grupo.setAttribute('role', 'button');
          grupo.setAttribute('aria-label', `${item.rotulo}: ${rotuloFaixa(item.min, item.max)}. Filtrar por este item`);
          grupo.addEventListener('click', () => aoClicar(item));
          grupo.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); aoClicar(item); } });
        }
      } else {
        grupo.appendChild(el('text', { x: margemRotulo, y: y + 22, class: 'rotulo-sem-dado' }, [item.nota || 'Sem agregado publicável']));
      }
      svg.appendChild(grupo);
    });
    return svg;
  }

  /* 2. Colunas verticais agrupadas mensais */
  function colunasMensais(meses, series, { titulo, rotuloMes } = {}) {
    const largura = 540, altura = 280, base = 230, topo = 28, esquerda = 44;
    const util = largura - esquerda - 16;
    const maximo = Math.max(1, ...series.flatMap(s => meses.map(m => s.porMes[m]?.max || 0)));
    const idTitulo = 'g' + Math.random().toString(36).slice(2, 9);
    const svg = el('svg', { viewBox: `0 0 ${largura} ${altura}`, width: largura, role: 'img', class: 'grafico', 'aria-labelledby': idTitulo });
    svg.appendChild(el('title', { id: idTitulo }, [titulo || 'Evolução mensal']));
    [0, 0.5, 1].forEach(f => {
      const y = base - (base - topo) * f;
      svg.appendChild(el('line', { x1: esquerda, x2: largura - 8, y1: y, y2: y, class: 'grade' }));
      svg.appendChild(el('text', { x: esquerda - 8, y: y + 4, 'text-anchor': 'end', class: 'rotulo-eixo pequeno' }, [String(Math.round(maximo * f))]));
    });
    const larguraMes = util / Math.max(1, meses.length);
    const larguraBarra = Math.min(54, (larguraMes - 24) / Math.max(1, series.length));
    meses.forEach((m, i) => {
      const x0 = esquerda + i * larguraMes + (larguraMes - larguraBarra * series.length) / 2;
      series.forEach((s, j) => {
        const v = s.porMes[m];
        const x = x0 + j * larguraBarra;
        if (!v) {
          svg.appendChild(el('text', { x: x + larguraBarra / 2, y: base - 6, 'text-anchor': 'middle', class: 'rotulo-sem-dado pequeno' }, ['—']));
          return;
        }
        const hMax = (base - topo) * v.max / maximo, hMin = (base - topo) * v.min / maximo;
        const g = el('g', {});
        g.appendChild(el('rect', { x: x + 3, y: base - hMax, width: larguraBarra - 6, height: hMax, rx: 3, class: 'barra-incerteza', style: `--cor:${s.cor}` }));
        g.appendChild(el('rect', { x: x + 3, y: base - hMin, width: larguraBarra - 6, height: hMin, rx: 3, class: 'barra-solida', style: `--cor:${s.cor}` }));
        g.appendChild(el('text', { x: x + larguraBarra / 2, y: base - hMax - 6, 'text-anchor': 'middle', class: 'rotulo-valor pequeno' }, [rotuloFaixa(v.min, v.max)]));
        g.appendChild(el('title', {}, [`${s.nome}, ${rotuloMes ? rotuloMes(m) : m}: ${rotuloFaixa(v.min, v.max)}`]));
        svg.appendChild(g);
      });
      svg.appendChild(el('text', { x: esquerda + i * larguraMes + larguraMes / 2, y: base + 22, 'text-anchor': 'middle', class: 'rotulo-eixo' }, [rotuloMes ? rotuloMes(m) : m]));
    });
    svg.appendChild(el('line', { x1: esquerda, x2: largura - 8, y1: base, y2: base, class: 'eixo' }));
    return svg;
  }

  /* 3. Gráfico de Rosca / Pizza ilustrativa dos limites inferiores publicáveis */
  function roscaFaixa(itens, { titulo, descricao, centroValor, centroRotulo, aoClicar } = {}) {
    const validos = itens.filter(i => i.estado === 'ok' && i.min > 0);
    const somaMin = validos.reduce((acc, i) => acc + i.min, 0);
    const somaMax = validos.reduce((acc, i) => acc + i.max, 0);
    const largura = 540, altura = Math.max(220, itens.length * 36 + 44);
    const cx = 112, cy = Math.min(110, altura / 2), r = 74, circunf = 2 * Math.PI * r;
    const idTitulo = 'g' + Math.random().toString(36).slice(2, 9);
    const svg = el('svg', { viewBox: `0 0 ${largura} ${altura}`, width: largura, role: 'img', class: 'grafico grafico-rosca', 'aria-labelledby': idTitulo });
    svg.appendChild(el('title', { id: idTitulo }, [(titulo || 'Composição por categoria') + (descricao ? '. ' + descricao : '')]));

    svg.appendChild(el('circle', { cx, cy, r, fill: 'none', stroke: 'var(--linha)', 'stroke-width': 26 }));
    let acumulado = 0;
    validos.forEach(item => {
      const frac = somaMin > 0 ? item.min / somaMin : 0;
      const comp = Math.max(frac * circunf - 2, 2);
      const offset = -acumulado * circunf;
      acumulado += frac;
      const fatia = el('circle', {
        cx, cy, r, fill: 'none', stroke: item.cor, 'stroke-width': 26,
        'stroke-dasharray': `${comp} ${circunf}`, 'stroke-dashoffset': offset,
        transform: `rotate(-90 ${cx} ${cy})`,
        class: 'fatia-rosca' + (aoClicar ? ' clicavel' : '')
      });
      fatia.appendChild(el('title', {}, [`${item.rotulo}: ${rotuloFaixa(item.min, item.max)} (mín. ${Math.round(frac * 100)}% dos limites inferiores)`]));
      if (aoClicar) {
        fatia.setAttribute('tabindex', '0');
        fatia.setAttribute('role', 'button');
        fatia.setAttribute('aria-label', `${item.rotulo}: ${rotuloFaixa(item.min, item.max)}. Filtrar por este item`);
        fatia.addEventListener('click', () => aoClicar(item));
        fatia.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); aoClicar(item); } });
      }
      svg.appendChild(fatia);
    });

    const rotCentro = centroValor || (somaMin ? rotuloFaixa(somaMin, somaMax) : '—');
    svg.appendChild(el('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', class: 'rosca-centro-valor' }, [rotCentro]));
    svg.appendChild(el('text', { x: cx, y: cy + 16, 'text-anchor': 'middle', class: 'rotulo-eixo pequeno' }, [centroRotulo || 'faixa somada']));

    const xLeg = 224;
    itens.forEach((item, idx) => {
      const y = 26 + idx * 34;
      const g = el('g', { class: 'linha-grafico' + (aoClicar && item.estado === 'ok' ? ' clicavel' : '') });
      g.appendChild(el('rect', { x: xLeg, y: y - 12, width: 14, height: 14, rx: 3, fill: item.estado === 'ok' ? item.cor : 'var(--linha)' }));
      g.appendChild(el('text', { x: xLeg + 22, y, class: 'rotulo-eixo' }, [item.rotulo]));
      const detalhe = item.estado === 'ok'
        ? `${rotuloFaixa(item.min, item.max)} (${somaMin > 0 ? Math.round(item.min * 100 / somaMin) + '% mín.' : '—'})`
        : (item.nota || 'Sem agregado publicável');
      g.appendChild(el('text', { x: largura - 8, y, 'text-anchor': 'end', class: item.estado === 'ok' ? 'rotulo-valor pequeno' : 'rotulo-sem-dado pequeno' }, [detalhe]));
      if (aoClicar && item.estado === 'ok') {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', `${item.rotulo}: ${rotuloFaixa(item.min, item.max)}. Filtrar`);
        g.addEventListener('click', () => aoClicar(item));
        g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); aoClicar(item); } });
      }
      svg.appendChild(g);
    });
    return svg;
  }

  /* 4. Barras empilhadas mensais (composição por mês) */
  function barrasEmpilhadasMensais(meses, series, { titulo, rotuloMes } = {}) {
    const largura = 540, altura = 270, base = 222, topo = 28, esquerda = 46;
    const util = largura - esquerda - 16;
    const totaisMes = meses.map(m => series.reduce((acc, s) => acc + (s.porMes[m]?.max || 0), 0));
    const maximo = Math.max(1, ...totaisMes);
    const idTitulo = 'g' + Math.random().toString(36).slice(2, 9);
    const svg = el('svg', { viewBox: `0 0 ${largura} ${altura}`, width: largura, role: 'img', class: 'grafico', 'aria-labelledby': idTitulo });
    svg.appendChild(el('title', { id: idTitulo }, [titulo || 'Composição mensal empilhada']));

    [0, 0.5, 1].forEach(f => {
      const y = base - (base - topo) * f;
      svg.appendChild(el('line', { x1: esquerda, x2: largura - 8, y1: y, y2: y, class: 'grade' }));
      svg.appendChild(el('text', { x: esquerda - 8, y: y + 4, 'text-anchor': 'end', class: 'rotulo-eixo pequeno' }, [String(Math.round(maximo * f))]));
    });

    const larguraMes = util / Math.max(1, meses.length);
    const larguraCol = Math.min(72, larguraMes * 0.52);
    meses.forEach((m, i) => {
      const cx = esquerda + i * larguraMes + larguraMes / 2;
      const x = cx - larguraCol / 2;
      let yCursor = base;
      let somaMin = 0, somaMax = 0;
      series.forEach(s => {
        const v = s.porMes[m];
        if (!v || v.max <= 0) return;
        somaMin += v.min;
        somaMax += v.max;
        const hSeg = Math.max(4, (base - topo) * v.min / maximo);
        const hInc = Math.max(hSeg, (base - topo) * v.max / maximo);
        const g = el('g', {});
        g.appendChild(el('rect', { x, y: yCursor - hInc, width: larguraCol, height: hInc, rx: 3, class: 'barra-incerteza', style: `--cor:${s.cor}` }));
        g.appendChild(el('rect', { x, y: yCursor - hSeg, width: larguraCol, height: hSeg, rx: 3, class: 'barra-solida', style: `--cor:${s.cor}` }));
        g.appendChild(el('title', {}, [`${s.nome} (${rotuloMes ? rotuloMes(m) : m}): ${rotuloFaixa(v.min, v.max)}`]));
        svg.appendChild(g);
        yCursor -= hInc + 2;
      });
      if (somaMax > 0) {
        svg.appendChild(el('text', { x: cx, y: Math.max(16, yCursor - 4), 'text-anchor': 'middle', class: 'rotulo-valor pequeno' }, [rotuloFaixa(somaMin, somaMax)]));
      } else {
        svg.appendChild(el('text', { x: cx, y: base - 8, 'text-anchor': 'middle', class: 'rotulo-sem-dado pequeno' }, ['—']));
      }
      svg.appendChild(el('text', { x: cx, y: base + 22, 'text-anchor': 'middle', class: 'rotulo-eixo' }, [rotuloMes ? rotuloMes(m) : m]));
    });
    svg.appendChild(el('line', { x1: esquerda, x2: largura - 8, y1: base, y2: base, class: 'eixo' }));
    return svg;
  }

  /* 5. Linha temporal de evolução mensal com faixa de incerteza (mínimo–máximo) */
  function linhaEvolucaoMensal(meses, series, { titulo, rotuloMes } = {}) {
    const largura = 540, altura = 260, base = 212, topo = 28, esquerda = 48, direita = largura - 24;
    const util = direita - esquerda;
    const maximo = Math.max(1, ...series.flatMap(s => meses.map(m => s.porMes[m]?.max || 0)));
    const idTitulo = 'g' + Math.random().toString(36).slice(2, 9);
    const svg = el('svg', { viewBox: `0 0 ${largura} ${altura}`, width: largura, role: 'img', class: 'grafico', 'aria-labelledby': idTitulo });
    svg.appendChild(el('title', { id: idTitulo }, [titulo || 'Linha de evolução mensal']));

    [0, 0.5, 1].forEach(f => {
      const y = base - (base - topo) * f;
      svg.appendChild(el('line', { x1: esquerda, x2: direita, y1: y, y2: y, class: 'grade' }));
      svg.appendChild(el('text', { x: esquerda - 8, y: y + 4, 'text-anchor': 'end', class: 'rotulo-eixo pequeno' }, [String(Math.round(maximo * f))]));
    });

    const posX = i => meses.length <= 1 ? (esquerda + direita) / 2 : esquerda + (i / (meses.length - 1)) * util;
    const posY = val => base - ((base - topo) * val / maximo);

    series.forEach(s => {
      const pontos = meses.map((m, i) => ({ m, i, x: posX(i), v: s.porMes[m] })).filter(p => p.v);
      if (pontos.length >= 2) {
        const superior = pontos.map(p => `${p.x},${posY(p.v.max)}`).join(' ');
        const inferior = [...pontos].reverse().map(p => `${p.x},${posY(p.v.min)}`).join(' ');
        svg.appendChild(el('polygon', { points: `${superior} ${inferior}`, fill: s.cor, opacity: '0.18' }));
        const caminhoMin = pontos.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x},${posY(p.v.min)}`).join(' ');
        svg.appendChild(el('path', { d: caminhoMin, fill: 'none', stroke: s.cor, 'stroke-width': 3 }));
      }
      pontos.forEach(p => {
        const yMin = posY(p.v.min), yMax = posY(p.v.max);
        svg.appendChild(el('line', { x1: p.x, x2: p.x, y1: yMax, y2: yMin, stroke: s.cor, 'stroke-width': 4, opacity: '0.45' }));
        const ponto = el('circle', { cx: p.x, cy: yMin, r: 5, fill: s.cor });
        ponto.appendChild(el('title', {}, [`${s.nome} (${rotuloMes ? rotuloMes(p.m) : p.m}): ${rotuloFaixa(p.v.min, p.v.max)}`]));
        svg.appendChild(ponto);
        svg.appendChild(el('text', { x: p.x, y: Math.max(16, yMax - 8), 'text-anchor': 'middle', class: 'rotulo-valor pequeno' }, [rotuloFaixa(p.v.min, p.v.max)]));
      });
    });

    meses.forEach((m, i) => {
      svg.appendChild(el('text', { x: posX(i), y: base + 22, 'text-anchor': 'middle', class: 'rotulo-eixo' }, [rotuloMes ? rotuloMes(m) : m]));
    });
    svg.appendChild(el('line', { x1: esquerda, x2: direita, y1: base, y2: base, class: 'eixo' }));
    return svg;
  }

  /* 6. Medidor horizontal de cobertura (segmentos empilhados proporcionais) */
  function medidorCobertura(segmentos, { titulo, unidade = '' } = {}) {
    const linhasLeg = Math.ceil(segmentos.length / 2);
    const largura = 540, altura = 56 + linhasLeg * 24, x0 = 12, util = largura - 24;
    const total = Math.max(1, segmentos.reduce((acc, s) => acc + Math.max(0, s.valor), 0));
    const idTitulo = 'g' + Math.random().toString(36).slice(2, 9);
    const svg = el('svg', { viewBox: `0 0 ${largura} ${altura}`, width: largura, role: 'img', class: 'grafico grafico-cobertura', 'aria-labelledby': idTitulo });
    svg.appendChild(el('title', { id: idTitulo }, [titulo || 'Indicador de cobertura']));

    let cursor = x0;
    segmentos.forEach(s => {
      if (s.valor <= 0) return;
      const w = Math.max(6, (s.valor / total) * util);
      const rect = el('rect', { x: cursor, y: 12, width: Math.min(w, x0 + util - cursor), height: 26, rx: 4, fill: s.cor });
      rect.appendChild(el('title', {}, [`${s.rotulo}: ${s.valor}${unidade ? ' ' + unidade : ''}`]));
      svg.appendChild(rect);
      cursor += w + 2;
    });

    segmentos.forEach((s, idx) => {
      const col = idx % 2, lin = Math.floor(idx / 2);
      const xLeg = x0 + col * 264, yLeg = 54 + lin * 22;
      const texto = `${s.rotulo}: ${s.valor}${unidade ? ' ' + unidade : ''}`;
      svg.appendChild(el('rect', { x: xLeg, y: yLeg - 11, width: 12, height: 12, rx: 3, fill: s.cor }));
      svg.appendChild(el('text', { x: xLeg + 18, y: yLeg, class: 'rotulo-eixo pequeno' }, [texto]));
    });
    return svg;
  }

  const api = {
    barrasFaixa,
    colunasMensais,
    roscaFaixa,
    barrasEmpilhadasMensais,
    linhaEvolucaoMensal,
    medidorCobertura,
    rotuloFaixa
  };
  raiz.GedivGraficos = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
