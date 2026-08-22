/* ══════════════════════════════════════════════════════════════════
   VISION RELEASE · Business, Vertrauen, Benachrichtigungen, Medien
   ══════════════════════════════════════════════════════════════════ */

var _businessJobs = [];
var _notificationPoll = null;

function _rvMoney(value) {
  return (Number(value) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}
function _rvPrice(job) {
  var c = job && job.card || {};
  var raw = c.price || c.amount || c.total || (job.listing && job.listing.price) || 0;
  if (typeof raw === 'number') return isFinite(raw) ? raw : 0;
  var cleaned = String(raw).replace(/[^0-9,.-]/g, '');
  if (cleaned.indexOf(',') !== -1) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  return Number(cleaned) || 0;
}
function _rvStatus(job) {
  var c = job && job.card || {};
  return c.stage || ((c.paidAt || c.paymentIntentId) ? 'abgeschlossen' : (c.fulfilledAt ? 'bestaetigt' : 'angebot'));
}
function _rvDate(job) {
  var raw = (job.project && job.project.date) || (job.card && (job.card.bookedAt || job.card.createdAt)) || '';
  var date = raw ? new Date(raw) : new Date();
  return isNaN(date.getTime()) ? new Date() : date;
}

function renderBusinessCockpit() {
  var root = document.getElementById('businessCockpit');
  if (!root) return;
  root.innerHTML = '<div class="release-hero"><div><span class="release-kicker">DIENSTLEISTER-ZENTRALE</span><h1>Dein Business auf einen Blick</h1><p>Aufträge, Einnahmen, Steuern, Rechnungen und Profilmedien – an einem Ort.</p></div>' +
    '<div class="release-hero-actions"><button class="btn-outline" onclick="navigateTo(\'profile\')"><span class="material-icons-round">visibility</span> Profilvorschau</button><button class="btn-primary" onclick="navigateTo(\'create-listing\')"><span class="material-icons-round">add_circle</span> Inserat erstellen</button></div></div>' +
    '<div class="release-loading"><div class="spinner"></div><span>Geschäftsdaten werden zusammengeführt …</span></div>';

  var local = typeof _collectLocalAuftragsboardJobs === 'function' ? _collectLocalAuftragsboardJobs() : [];
  fetch(_apiUrl('board-bookings'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(resp){ if (!resp.ok) throw new Error('HTTP ' + resp.status); return resp.json(); })
    .then(function(data){
      var jobs = local.slice();
      ((data && data.bookings) || []).forEach(function(b){
        if (jobs.some(function(j){ return j.card && b.card && j.card.id === b.card.id; })) return;
        jobs.push({ card: b.card || {}, project: { id:b.project_id, name:b.project_name, date:b.project_date }, customerName:b.customer_name, remote:true });
      });
      _renderBusinessCockpitData(jobs, false);
    })
    .catch(function(){ _renderBusinessCockpitData(local, true); });
}

function _renderBusinessCockpitData(jobs, offline) {
  var root = document.getElementById('businessCockpit');
  if (!root) return;
  _businessJobs = jobs || [];
  var booked = _businessJobs.reduce(function(sum,j){ return sum + _rvPrice(j); }, 0);
  var paid = _businessJobs.reduce(function(sum,j){
    return sum + (_cardHasConfirmedPayment(j && j.card) ? _rvPrice(j) : 0);
  }, 0);
  var open = _businessJobs.filter(function(j){ return _rvStatus(j) !== 'abgeschlossen'; }).length;
  var fee = paid * 0.03;
  var paidOut = Math.max(0, paid - fee);

  var header = '<div class="release-hero"><div><span class="release-kicker">DIENSTLEISTER-ZENTRALE</span><h1>Dein Business auf einen Blick</h1><p>Aufträge, Einnahmen, Steuern, Rechnungen und Profilmedien – an einem Ort.</p></div>' +
    '<div class="release-hero-actions"><button class="btn-outline" onclick="navigateTo(\'profile\')"><span class="material-icons-round">visibility</span> Profilvorschau</button><button class="btn-primary" onclick="navigateTo(\'create-listing\')"><span class="material-icons-round">add_circle</span> Inserat erstellen</button></div></div>';
  var sync = offline ? '<div class="release-status warn"><span class="material-icons-round">cloud_off</span>Serverdaten waren nicht erreichbar. Angezeigt werden lokal verfügbare Aufträge.</div>' : '<div class="release-status ok"><span class="material-icons-round">verified</span>Live mit Aufträgen und Plattformzahlungen abgeglichen.</div>';
  var kpis = '<div class="business-kpis">' +
    _businessKpi('payments', _rvMoney(booked), 'Auftragsvolumen', _businessJobs.length + ' Aufträge') +
    _businessKpi('account_balance_wallet', _rvMoney(paidOut), 'Auszahlung nach Provision', 'vor individuellen Steuern') +
    _businessKpi('pending_actions', String(open), 'Offene Aufträge', 'noch nicht abgeschlossen') +
    _businessKpi('receipt_long', _rvMoney(fee), 'Plattformprovision', '3 % auf bezahlte Aufträge') + '</div>';
  root.innerHTML = header + sync + kpis + '<div class="business-grid"><section class="release-panel business-chart-panel"><div class="release-panel-head"><div><span class="release-kicker">UMSATZVERLAUF</span><h2>Einnahmen &amp; Pipeline</h2></div><button class="btn-outline btn-sm" onclick="navigateTo(\'auftraege\')">Alle Aufträge</button></div>' + _businessChart(_businessJobs) + '</section>' +
    '<section class="release-panel"><div class="release-panel-head"><div><span class="release-kicker">STEUERPROFIL</span><h2>Rechnungsangaben</h2></div></div>' + _businessTaxForm() + '</section></div>' +
    '<section class="release-panel business-invoices"><div class="release-panel-head"><div><span class="release-kicker">DOKUMENTE</span><h2>Rechnungen &amp; Aufträge</h2></div><span class="release-note">PDF-Belege sind eine Abrechnungsübersicht, keine Steuerberatung.</span></div>' + _businessInvoiceTable(_businessJobs) + '</section>' +
    '<section class="release-panel media-studio"><div class="release-panel-head"><div><span class="release-kicker">SMART MEDIA STUDIO · BETA</span><h2>Einzigartige Profil- und Inseratsmotive</h2></div><span class="release-beta">Accountgebunden</span></div>' + _mediaStudioHtml() + '</section>';
  _drawBusinessMediaPreview();
}

function _businessKpi(icon, value, label, hint) {
  return '<article class="business-kpi"><span class="material-icons-round">' + icon + '</span><div><strong>' + _escHtml(value) + '</strong><h3>' + _escHtml(label) + '</h3><small>' + _escHtml(hint) + '</small></div></article>';
}

function _businessChart(jobs) {
  var now = new Date();
  var months = [];
  for (var i=5; i>=0; i--) months.push(new Date(now.getFullYear(), now.getMonth()-i, 1));
  var values = months.map(function(m){
    return jobs.reduce(function(sum,j){ var d=_rvDate(j); return d.getMonth()===m.getMonth() && d.getFullYear()===m.getFullYear() ? sum+_rvPrice(j) : sum; },0);
  });
  var max = Math.max.apply(Math, values.concat([1]));
  return '<div class="business-chart" role="img" aria-label="Umsatz der letzten sechs Monate">' + months.map(function(m,i){
    var h = Math.max(6, Math.round(values[i] / max * 100));
    return '<div class="business-bar-col"><span>' + (values[i] ? _rvMoney(values[i]) : '–') + '</span><div class="business-bar-track"><i style="height:' + h + '%"></i></div><small>' + m.toLocaleDateString('de-DE',{month:'short'}) + '</small></div>';
  }).join('') + '</div>';
}

function _businessTaxForm() {
  var t = currentUser && currentUser.taxProfile || {};
  return '<form class="business-tax-form" onsubmit="saveBusinessTaxProfile(event)"><label><span>Umsatzsteuer</span><select id="businessTaxMode"><option value="small"' + (t.smallBusiness !== false ? ' selected' : '') + '>Kleinunternehmer (§ 19 UStG)</option><option value="vat"' + (t.smallBusiness === false ? ' selected' : '') + '>Umsatzsteuer ausweisen</option></select></label>' +
    '<label><span>USt.-Satz</span><select id="businessVatRate"><option value="19"' + (Number(t.vatRate||19)===19?' selected':'') + '>19 %</option><option value="7"' + (Number(t.vatRate)===7?' selected':'') + '>7 %</option><option value="0"' + (Number(t.vatRate)===0?' selected':'') + '>0 %</option></select></label>' +
    '<label><span>Rechnungssteller / Firma</span><input id="businessLegalName" value="' + _escHtml(t.businessName||currentUser.company||currentUser.name||'') + '" placeholder="Firma oder vollständiger Name"></label>' +
    '<label><span>Geschäftsanschrift</span><input id="businessLegalAddress" value="' + _escHtml(t.address||'') + '" placeholder="Straße und Hausnummer"></label>' +
    '<label><span>PLZ und Ort</span><input id="businessLegalCity" value="' + _escHtml(t.city||'') + '" placeholder="12345 Musterstadt"></label>' +
    '<label><span>Steuernummer / USt-ID</span><input id="businessTaxNumber" value="' + _escHtml(t.taxNumber||'') + '" placeholder="optional"></label>' +
    '<label><span>Rechnungspräfix</span><input id="businessInvoicePrefix" value="' + _escHtml(t.invoicePrefix||'EB') + '" maxlength="8"></label>' +
    '<button class="btn-primary" type="submit"><span class="material-icons-round">save</span> Speichern</button></form>';
}

function saveBusinessTaxProfile(event) {
  event.preventDefault();
  var profile = {
    smallBusiness: document.getElementById('businessTaxMode').value === 'small',
    vatRate: Number(document.getElementById('businessVatRate').value),
    businessName: document.getElementById('businessLegalName').value.trim(),
    address: document.getElementById('businessLegalAddress').value.trim(),
    city: document.getElementById('businessLegalCity').value.trim(),
    taxNumber: document.getElementById('businessTaxNumber').value.trim(),
    invoicePrefix: document.getElementById('businessInvoicePrefix').value.trim() || 'EB'
  };
  fetch(_apiUrl('profile'), { method:'POST', credentials:'same-origin', headers:_apiHeaders(), body:JSON.stringify({taxProfile:profile}) })
    .then(function(r){ if(!r.ok) throw new Error(); currentUser.taxProfile=profile; showToast('Rechnungsangaben gespeichert.','check_circle'); })
    .catch(function(){ showToast('Rechnungsangaben konnten nicht gespeichert werden.','error'); });
}

function _businessInvoiceTable(jobs) {
  if (!jobs.length) return '<div class="release-empty"><span class="material-icons-round">receipt_long</span><h3>Noch keine Rechnung</h3><p>Nach der ersten Plattformbuchung erscheint hier automatisch der PDF-Beleg.</p></div>';
  return '<div class="business-invoice-table"><div class="business-invoice-row head"><span>Rechnung</span><span>Projekt</span><span>Status</span><span>Betrag</span><span>PDF</span></div>' + jobs.map(function(j,i){
    var id = _businessInvoiceNo(j,i);
    var project = j.project && j.project.name || j.card && (j.card.title || j.card.listingTitle) || 'Event-Auftrag';
    var status = _rvStatus(j);
    return '<div class="business-invoice-row"><span><strong>' + _escHtml(id) + '</strong><small>' + _rvDate(j).toLocaleDateString('de-DE') + '</small></span><span>' + _escHtml(project) + '</span><span><i class="invoice-status ' + _escHtml(status) + '">' + _escHtml(_rvStageLabel(status)) + '</i></span><span>' + _rvMoney(_rvPrice(j)) + '</span><span><button class="btn-outline btn-sm" onclick="downloadBusinessInvoice(' + i + ')"><span class="material-icons-round">picture_as_pdf</span> Vorschau/PDF</button></span></div>';
  }).join('') + '</div>';
}
function _rvStageLabel(s){ return ({angebot:'Gebucht',bestaetigt:'Erfüllt',abgeschlossen:'Bezahlt',kontaktiert:'Kontaktiert',geplant:'Geplant'})[s] || s; }
function _businessInvoiceNo(job,index){
  var prefix = currentUser && currentUser.taxProfile && currentUser.taxProfile.invoicePrefix || 'EB';
  var stable = String(job && job.card && job.card.id || job && job.project && job.project.id || index+1);
  var number = (_mediaHash(stable) % 1000000) + 1;
  return String(prefix).toUpperCase() + '-' + _rvDate(job).getFullYear() + '-' + String(number).padStart(6,'0');
}

function _pdfAscii(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'-').replace(/[()\\]/g,'\\$&');
}
function _simplePdf(lines) {
  var stream = 'BT\n/F1 18 Tf\n50 790 Td\n(' + _pdfAscii(lines[0]) + ') Tj\n/F1 10 Tf\n';
  lines.slice(1).forEach(function(line){ stream += '0 -24 Td\n(' + _pdfAscii(line) + ') Tj\n'; });
  stream += 'ET';
  var objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream'
  ];
  var pdf = '%PDF-1.4\n', offsets=[0];
  objects.forEach(function(obj,i){ offsets.push(pdf.length); pdf += (i+1) + ' 0 obj\n' + obj + '\nendobj\n'; });
  var xref = pdf.length;
  pdf += 'xref\n0 ' + (objects.length+1) + '\n0000000000 65535 f \n';
  offsets.slice(1).forEach(function(off){ pdf += String(off).padStart(10,'0') + ' 00000 n \n'; });
  pdf += 'trailer\n<< /Size ' + (objects.length+1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  return new Blob([pdf], {type:'application/pdf'});
}
function downloadBusinessInvoice(index) {
  var j = _businessJobs[index]; if (!j) return;
  var gross = _rvPrice(j), platform = gross*0.03;
  var t = currentUser && currentUser.taxProfile || {};
  var vat = t.smallBusiness === false ? gross * Number(t.vatRate||19) / (100+Number(t.vatRate||19)) : 0;
  var no = _businessInvoiceNo(j,index);
  var lines = [
    'Eventboerse Abrechnungsbeleg ' + no,
    'Rechnungssteller: ' + (t.businessName || currentUser && currentUser.name || ''),
    'Anschrift: ' + [t.address,t.city].filter(Boolean).join(', '),
    'Steuernummer / USt-ID: ' + (t.taxNumber || '-'),
    'Projekt: ' + (j.project && j.project.name || 'Event-Auftrag'),
    'Datum: ' + _rvDate(j).toLocaleDateString('de-DE'),
    'Status: ' + _rvStageLabel(_rvStatus(j)),
    'Bruttobetrag: ' + _rvMoney(gross),
    'Eventboerse Provision (3%): -' + _rvMoney(platform),
    (t.smallBusiness === false ? 'Enthaltene Umsatzsteuer: ' + _rvMoney(vat) : 'Hinweis: Kleinunternehmer nach Paragraph 19 UStG'),
    'Voraussichtliche Auszahlung vor Zahlungsgebuehr: ' + _rvMoney(gross-platform),
    'Zahlungs- und Steueruebersicht - keine Steuerberatung.'
  ];
  var url = URL.createObjectURL(_simplePdf(lines));
  var a=document.createElement('a'); a.href=url; a.download=no+'.pdf'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); },3000);
  showToast('Rechnungs-PDF erstellt.','picture_as_pdf');
}

function _mediaStudioHtml() {
  return '<div class="media-studio-grid"><div class="media-studio-controls"><label><span>Motiv-Briefing</span><input id="mediaStudioPrompt" value="Elegante Hochzeit bei warmem Abendlicht" maxlength="90" oninput="_drawBusinessMediaPreview()"></label>' +
    '<div class="media-style-row"><button class="media-style active" data-style="editorial" onclick="selectMediaStyle(this)">Editorial</button><button class="media-style" data-style="night" onclick="selectMediaStyle(this)">Night</button><button class="media-style" data-style="minimal" onclick="selectMediaStyle(this)">Minimal</button></div>' +
    '<label><span>Format</span><select id="mediaStudioFormat" onchange="_drawBusinessMediaPreview()"><option value="square">Profil · 1:1</option><option value="wide">Inserat · 16:9</option></select></label>' +
    '<p class="release-note">Der Beta-Entwurfsmodus erzeugt sofort ein individuelles, lizenzfreies Markenmotiv. Ein externes generatives Fotomodell ist noch nicht aktiviert – das wird bewusst nicht vorgetäuscht.</p>' +
    '<button class="btn-primary" onclick="createAccountMedia()"><span class="material-icons-round">auto_awesome</span> Neues Motiv erzeugen &amp; speichern</button></div>' +
    '<div class="media-preview-wrap"><canvas id="mediaStudioCanvas" width="960" height="960" aria-label="Vorschau des neuen Motivs"></canvas><div id="mediaStudioResult" class="media-result-actions"></div></div></div>';
}
function selectMediaStyle(btn) {
  document.querySelectorAll('.media-style').forEach(function(b){ b.classList.remove('active'); }); btn.classList.add('active'); _drawBusinessMediaPreview();
}
function _mediaHash(text) { var h=2166136261; for(var i=0;i<text.length;i++){ h^=text.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function _drawBusinessMediaPreview(seedExtra) {
  var c=document.getElementById('mediaStudioCanvas'); if(!c) return;
  var prompt=(document.getElementById('mediaStudioPrompt')||{}).value||'Dein Event';
  var format=(document.getElementById('mediaStudioFormat')||{}).value||'square';
  c.width=960; c.height=format==='wide'?540:960;
  var ctx=c.getContext('2d'), style=(document.querySelector('.media-style.active')||{}).dataset && document.querySelector('.media-style.active').dataset.style || 'editorial';
  var hash=_mediaHash(prompt+style+(seedExtra||'')), hue=hash%360;
  var g=ctx.createLinearGradient(0,0,c.width,c.height);
  if(style==='night'){ g.addColorStop(0,'hsl('+hue+',55%,12%)');g.addColorStop(1,'hsl('+((hue+70)%360)+',70%,35%)'); }
  else if(style==='minimal'){ g.addColorStop(0,'hsl('+hue+',30%,96%)');g.addColorStop(1,'hsl('+((hue+25)%360)+',40%,82%)'); }
  else { g.addColorStop(0,'hsl('+hue+',75%,58%)');g.addColorStop(1,'hsl('+((hue+55)%360)+',80%,38%)'); }
  ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
  for(var i=0;i<9;i++){ var x=((hash>>(i%16))*31+i*173)%c.width,y=((hash>>(i%12))*17+i*127)%c.height,r=40+((hash+i*91)%170);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+(0.04+(i%3)*0.025)+')';ctx.fill(); }
  ctx.fillStyle=style==='minimal'?'#18181b':'#fff';ctx.font='700 '+Math.round(c.width/20)+'px Inter, sans-serif';ctx.textAlign='left';
  var words=prompt.trim().split(/\s+/), lines=[],line=''; words.forEach(function(w){ if((line+' '+w).length>28){lines.push(line);line=w;}else line+=(line?' ':'')+w;});if(line)lines.push(line);
  lines.slice(0,3).forEach(function(l,i){ctx.fillText(l,70,c.height-170+(i-lines.length+1)*62);});
  ctx.font='600 20px Inter, sans-serif';ctx.fillText('DIGITAL ERSTELLT · EVENTBÖRSE · KEIN KI-FOTOMODELL',72,c.height-62);
}
function createAccountMedia() {
  var c=document.getElementById('mediaStudioCanvas'); if(!c) return;
  _drawBusinessMediaPreview(String(Date.now()));
  c.toBlob(function(blob){
    if(!blob){showToast('Motiv konnte nicht erstellt werden.','error');return;}
    var file=new File([blob],'eventboerse-motiv-'+Date.now()+'.png',{type:'image/png'});
    uploadFile(file).then(function(data){
      var result=document.getElementById('mediaStudioResult');
      if(result) result.innerHTML='<span><span class="material-icons-round">verified_user</span> Digital erstellt · kein KI-Fotomodell · Account #' + _escHtml(String(data.ownerId||currentUser.id)) + '</span><button class="btn-outline btn-sm" onclick="useMediaInPortfolio(\'' + _escHtml(data.url) + '\')">Ins Portfolio</button><button class="btn-outline btn-sm" onclick="useMediaAsProfilePhoto(\'' + _escHtml(data.url) + '\')">Als Profilbild</button>';
      showToast('Motiv sicher in deinem Account gespeichert.','verified_user');
    }).catch(function(err){ showToast(err.message||'Upload fehlgeschlagen.','error'); });
  },'image/png',0.92);
}
function useMediaInPortfolio(url){
  var gallery=(currentUser.gallery||[]).slice(); if(gallery.indexOf(url)<0)gallery.push(url);
  fetch(_apiUrl('profile'),{method:'POST',credentials:'same-origin',headers:_apiHeaders(),body:JSON.stringify({gallery:gallery})}).then(function(r){if(!r.ok)throw new Error();currentUser.gallery=gallery;showToast('Motiv im Portfolio gespeichert.','photo_library');}).catch(function(){showToast('Portfolio konnte nicht gespeichert werden.','error');});
}
function useMediaAsProfilePhoto(url){
  fetch(_apiUrl('profile'),{method:'POST',credentials:'same-origin',headers:_apiHeaders(),body:JSON.stringify({photoUrl:url})}).then(function(r){if(!r.ok)throw new Error();currentUser.photoUrl=url;showToast('Profilbild gespeichert.','account_circle');}).catch(function(){showToast('Profilbild konnte nicht gespeichert werden.','error');});
}

/* ── Beidseitig bestätigte Zusammenarbeit ─────────────────────────── */
function loadProviderCollaborations(providerId, isOwn) {
  var root=document.getElementById('providerCollaborations'); if(!root)return;
  root.innerHTML='<div class="release-loading"><div class="spinner"></div><span>Partnerschaften werden geprüft …</span></div>';
  var endpoint=isOwn?'collaborations':'provider/'+providerId;
  fetch(_apiUrl(endpoint)+'?_t='+Date.now(),{credentials:'same-origin',headers:_apiHeaders()}).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(data){
    var items=isOwn?(data.items||[]):(data.collaborations||[]); _renderProviderCollaborations(items,isOwn);
  }).catch(function(){ _renderProviderCollaborations([],isOwn,true); });
}
function _collabPartner(item){return item&&item.partner||{};}
function _renderProviderCollaborations(items,isOwn,offline) {
  var root=document.getElementById('providerCollaborations'); if(!root)return;
  var confirmed=(items||[]).filter(function(x){return x.status==='confirmed';});
  var pending=(items||[]).filter(function(x){return x.status==='pending';});
  var intro='<div class="collab-intro"><div><span class="material-icons-round">verified</span><div><h3>Vertrauen durch echte Zusammenarbeit</h3><p>Eine Verbindung wird erst sichtbar, wenn beide Dienstleister sie bestätigt haben.</p></div></div>' + (isOwn?'<button class="btn-primary" onclick="openCollaborationRequest()"><span class="material-icons-round">add_link</span> Zusammenarbeit hinzufügen</button>':'') + '</div>';
  var content=confirmed.length?'<div class="collaboration-grid">'+confirmed.map(_collaborationCard).join('')+'</div>':'<div class="release-empty compact"><span class="material-icons-round">handshake</span><h3>Noch keine bestätigten Partner</h3><p>'+(isOwn?'Füge Dienstleister hinzu, mit denen du bereits gearbeitet hast.':'Dieses Profil hat noch keine öffentlich bestätigte Zusammenarbeit.')+'</p></div>';
  var pendingHtml='';
  if(isOwn&&pending.length){pendingHtml='<div class="collab-pending"><h3>Offene Bestätigungen</h3>'+pending.map(function(x){var p=_collabPartner(x);return '<div class="collab-pending-row"><span><strong>'+_escHtml(p.name||'Dienstleister')+'</strong><small>'+_escHtml(x.event||'Zusammenarbeit')+' · '+(x.direction==='incoming'?'möchte bestätigt werden':'Anfrage gesendet')+'</small></span>'+(x.direction==='incoming'?'<button class="btn-primary btn-sm" onclick="confirmCollaboration(\''+_escHtml(x.id)+'\')">Bestätigen</button>':'<i>Ausstehend</i>')+'</div>';}).join('')+'</div>';}
  root.innerHTML=intro+(offline?'<div class="release-status warn">Partnerschaften konnten gerade nicht live geladen werden.</div>':'')+content+pendingHtml;
}
function _collaborationCard(item){var p=_collabPartner(item);return '<button class="collaboration-card" onclick="navigateTo(\'provider\','+Number(p.id||0)+')"><img src="'+_escHtml(p.photoUrl||ebAvatar(p.name||'Partner',p.name))+'" alt="" loading="lazy"><span><strong>'+_escHtml(p.name||'Dienstleister')+'</strong><small>'+_escHtml(item.event||p.tagline||'Bestätigte Zusammenarbeit')+'</small><i><span class="material-icons-round">verified</span>beidseitig bestätigt</i></span><span class="material-icons-round">arrow_forward</span></button>';}
function openCollaborationRequest(){
  var seen={},providers=(LISTINGS||[]).filter(function(l){var id=_listingOwnerId(l);if(!id||_sameUserId(id,currentUser.id)||seen[id])return false;seen[id]=1;return true;});
  var opts=providers.map(function(l){return '<option value="'+_listingOwnerId(l)+'">'+_escHtml(l.providerName||l.title)+'</option>';}).join('');
  if(!opts){showToast('Noch keine weiteren Dienstleister verfügbar.','info');return;}
  document.body.insertAdjacentHTML('beforeend','<div class="modal-overlay show" id="collaborationModal" onclick="closeModalOnOverlay(event)"><div class="modal modal-sm" onclick="event.stopPropagation()"><button class="modal-close" onclick="document.getElementById(\'collaborationModal\').remove()"><span class="material-icons-round">close</span></button><div class="modal-header"><span class="material-icons-round modal-icon">handshake</span><h2>Zusammenarbeit bestätigen</h2><p>Der Partner erhält eine Anfrage. Erst nach seiner Bestätigung wird die Referenz öffentlich.</p></div><form class="modal-form" onsubmit="requestCollaboration(event)"><label>Dienstleister<select id="collaborationPartner" required>'+opts+'</select></label><label>Gemeinsames Event / Referenz<input id="collaborationEvent" maxlength="100" placeholder="z. B. Hochzeit im Schloss Benrath" required></label><button class="btn-primary btn-block" type="submit">Anfrage senden</button></form></div></div>');
}
function requestCollaboration(event){event.preventDefault();var p={partner_id:Number(document.getElementById('collaborationPartner').value),event:document.getElementById('collaborationEvent').value.trim()};fetch(_apiUrl('collaborations'),{method:'POST',credentials:'same-origin',headers:_apiHeaders(),body:JSON.stringify(p)}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.message);return d;});}).then(function(){document.getElementById('collaborationModal').remove();loadProviderCollaborations(currentUser.id,true);showToast('Anfrage gesendet. Sichtbar nach Bestätigung.','outgoing_mail');}).catch(function(e){showToast(e.message||'Anfrage fehlgeschlagen.','error');});}
function confirmCollaboration(id){fetch(_apiUrl('collaborations/'+id+'/confirm'),{method:'POST',credentials:'same-origin',headers:_apiHeaders(),body:'{}'}).then(function(r){if(!r.ok)throw new Error();loadProviderCollaborations(currentUser.id,true);showToast('Zusammenarbeit ist jetzt bestätigt.','verified');}).catch(function(){showToast('Bestätigung fehlgeschlagen.','error');});}
function renderDetailCollaborationSuggestions(providerId){
  var root=document.getElementById('detailCollaborationSuggestions');if(!root){return;}root.innerHTML='';if(!providerId)return;
  fetch(_apiUrl('provider/'+providerId)+'?_t='+Date.now(),{credentials:'same-origin',headers:_apiHeaders()}).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(data){var items=(data.collaborations||[]).slice(0,3);if(!items.length)return;root.innerHTML='<div><span class="material-icons-round">hub</span><span><strong>Passendes Netzwerk dieses Anbieters</strong><small>Beidseitig bestätigte Partner für dein Event</small></span></div><div class="detail-collab-list">'+items.map(function(x){var p=_collabPartner(x);return '<button onclick="navigateTo(\'provider\','+Number(p.id||0)+')"><img src="'+_escHtml(p.photoUrl||ebAvatar(p.name||'Partner',p.name))+'" alt=""><span>'+_escHtml(p.name||'Partner')+'</span><i class="material-icons-round">verified</i></button>';}).join('')+'</div>';}).catch(function(){});
}

/* ── Benachrichtigungsverlauf ────────────────────────────────────── */
function refreshNotificationBadge(){
  if(!isLoggedIn)return;fetch(_apiUrl('notifications'),{credentials:'same-origin',headers:_apiHeaders()}).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(d){var b=document.getElementById('notificationBadge');if(!b)return;var n=Number(d.unread)||0;b.textContent=n>9?'9+':String(n);b.style.display=n?'':'none';}).catch(function(){});
}
function renderNotificationCenter(){var root=document.getElementById('notificationHistory');if(!root)return;root.innerHTML='<div class="release-hero"><div><span class="release-kicker">DEIN VERLAUF</span><h1>Benachrichtigungen</h1><p>Buchungen, Nachrichten, Partnerschaften und Rechnungen nachvollziehbar an einem Ort.</p></div><button class="btn-outline" onclick="markAllNotificationsRead()"><span class="material-icons-round">done_all</span> Alle gelesen</button></div><div class="release-loading"><div class="spinner"></div></div>';fetch(_apiUrl('notifications'),{credentials:'same-origin',headers:_apiHeaders()}).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(d){_renderNotifications(d.items||[]);}).catch(function(){root.innerHTML+='<div class="release-status warn">Der Verlauf konnte gerade nicht geladen werden.</div>';});}
function _renderNotifications(items){var root=document.getElementById('notificationHistory');if(!root)return;var hero='<div class="release-hero"><div><span class="release-kicker">DEIN VERLAUF</span><h1>Benachrichtigungen</h1><p>Buchungen, Nachrichten, Partnerschaften und Rechnungen nachvollziehbar an einem Ort.</p></div><button class="btn-outline" onclick="markAllNotificationsRead()"><span class="material-icons-round">done_all</span> Alle gelesen</button></div>';if(!items.length){root.innerHTML=hero+'<div class="release-empty"><span class="material-icons-round">notifications_none</span><h3>Alles ruhig</h3><p>Neue Nachrichten, Buchungen und Bestätigungen erscheinen hier.</p></div>';return;}root.innerHTML=hero+'<div class="notification-list">'+items.map(function(n){return '<button class="notification-item'+(n.read?'':' unread')+'" onclick="openNotification(\''+_escHtml(n.id)+'\',\''+_escHtml(n.url||'')+'\')"><span class="material-icons-round">'+_notificationIcon(n.type)+'</span><span><strong>'+_escHtml(n.title)+'</strong><p>'+_escHtml(n.body||'')+'</p><small>'+_escHtml(_rvRelativeDate(n.created))+'</small></span><i></i></button>';}).join('')+'</div>';}
function _notificationIcon(t){return ({message:'chat',booking:'event_available',invoice:'receipt_long',collaboration:'handshake'})[t]||'notifications';}
function _rvRelativeDate(raw){var d=new Date(raw),delta=Date.now()-d.getTime();if(isNaN(delta))return '';if(delta<3600000)return 'vor '+Math.max(1,Math.round(delta/60000))+' Min.';if(delta<86400000)return 'vor '+Math.round(delta/3600000)+' Std.';return d.toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'});}
function markAllNotificationsRead(){fetch(_apiUrl('notifications/read'),{method:'POST',credentials:'same-origin',headers:_apiHeaders(),body:'{}'}).then(function(){renderNotificationCenter();refreshNotificationBadge();showToast('Alle als gelesen markiert.','done_all');});}
function openNotification(id,url){fetch(_apiUrl('notifications/read'),{method:'POST',credentials:'same-origin',headers:_apiHeaders(),body:JSON.stringify({id:id})}).finally(function(){refreshNotificationBadge();var path='';try{path=new URL(url,location.origin).pathname.replace(/^\//,'').split('/')[0];}catch(e){}navigateTo(path==='business'?'business':path==='profil'?'profile':path==='nachrichten'?'messages':'notifications');});}

/* ── Mobile Hochzeit Express ─────────────────────────────────────── */
function openWeddingExpress(){if(!isLoggedIn){openModal('loginModal');showToast('Melde dich an, um deine Hochzeit zu planen.','favorite');return;}if(currentPage!=='board')navigateTo('board');setTimeout(function(){openCreateBoardModal();setTimeout(function(){var card=document.querySelector('#createBoardModal [data-tmpl="wedding"]');if(card)_selectBoardTmpl(card);var name=document.getElementById('newBoardName');if(name){name.placeholder='Unsere Hochzeit';name.focus();}},50);},80);}

document.addEventListener('DOMContentLoaded',function(){
  setTimeout(refreshNotificationBadge,1800);
  if(_notificationPoll)clearInterval(_notificationPoll);
  _notificationPoll=setInterval(refreshNotificationBadge,60000);
});

/* Demo-Bilder auf die eigene Mediathek umbiegen — einmal, nachdem alle
   Module geladen sind und LISTINGS existiert. Steht hier ganz am Ende, weil
   die Verkettung in modules.list die Reihenfolge bestimmt: früher aufgerufen
   gäbe es die Daten noch nicht. */
(function () {
  if (typeof window.ebDemoBilderUmschreiben !== 'function') return;
  try {
    var n = 0;
    if (typeof LISTINGS !== 'undefined') n += window.ebDemoBilderUmschreiben(LISTINGS);
    if (typeof EVENTS !== 'undefined') n += window.ebDemoBilderUmschreiben(EVENTS);
    void n;
  } catch (e) { /* Ein fehlgeschlagenes Umbiegen darf die Seite nicht aufhalten. */ }
})();
