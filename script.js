// ====== CONFIG ======
const whatsappNumber = "5531990723954"; // destino sem + ou sinais
const pixKey = "00020126580014BR.GOV.BCB.PIX01365c6de5f3-72af-4c31-bae1-da6c35db75cd5204000053039865802BR5922Elder Luis Vieira Rosa6009SAO PAULO62140510hhozthu2PF63047497";
// se quiser trocar: altere acima

// Serviços com preços (coincidem com o visual)
const servicesData = [
  {name:"Corte", price:30},
  {name:"Barba", price:20},
  {name:"Hidratação", price:30},
  {name:"Escovinha", price:20},
  {name:"Pezinho", price:7},
  {name:"Desenho", price:10},
  {name:"Sobrancelha", price:7},
  {name:"Pigmentação", price:30},
  {name:"Textura", price:30},
  {name:"Luzes", price:50},
  {name:"Progressiva", price:100},
  {name:"Nevou", price:150}
];

// ====== DOM ======
const servicesListEl = document.getElementById("servicesList");
const totalEl = document.getElementById("total");
const timeSelect = document.getElementById("time");
const btnProceed = document.getElementById("btnProceed");

const pixModal = document.getElementById("pixModal");
const pixQrImg = document.getElementById("pixQrImg");
const pixKeyInput = document.getElementById("pixKeyInput");
const copyPixBtn = document.getElementById("copyPixBtn");
const closeModalBtn = document.getElementById("closeModal");
const confirmSendBtn = document.getElementById("confirmSendBtn");

// Form fields
const form = document.getElementById("appointmentForm");
const clientNameInput = document.getElementById("clientName");
const clientPhoneInput = document.getElementById("clientPhone");
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");

// ====== Inicializações ======

// preencher horários
const availableTimes = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
availableTimes.forEach(t => {
  const opt = document.createElement("option");
  opt.value = t; opt.textContent = t;
  timeSelect.appendChild(opt);
});

// preencher checkboxes dos serviços
servicesData.forEach((s, idx) => {
  const wrapper = document.createElement("label");
  wrapper.innerHTML = `
    <input type="checkbox" class="service-checkbox" data-name="${s.name}" data-price="${s.price}" />
    <div style="flex:1">
      <div style="font-weight:700">${s.name}</div>
      <div style="color:#bfbfbf;font-size:13px">R$ ${s.price.toFixed(2).replace('.',',')}</div>
    </div>
  `;
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "10px";
  servicesListEl.appendChild(wrapper);
});

// atualizar total
function calculateTotal(){
  const checks = Array.from(document.querySelectorAll(".service-checkbox"));
  let total = 0;
  checks.forEach(c => { if(c.checked) total += Number(c.dataset.price); });
  // formatação: substitui separador decimal por vírgula
  totalEl.textContent = `Total: R$ ${total.toFixed(2).replace('.',',')}`;
  return total;
}
document.addEventListener("change", e => {
  if(e.target && e.target.classList && e.target.classList.contains("service-checkbox")){
    calculateTotal();
  }
});

// inicial calcular
calculateTotal();

// gerar QR (utilizo api pública para gerar imagem do QR)
function generateQrImage(key){
  // usar endpoint de qrserver
  const payload = encodeURIComponent(key);
  // tamanho grande (320x320) para destaque
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${payload}`;
}

// copiar PIX
copyPixBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(pixKey);
    alert("Chave PIX copiada!");
  } catch (err) {
    // fallback
    pixKeyInput.select();
    document.execCommand('copy');
    alert("Chave PIX copiada!");
  }
});

// fechar modal
closeModalBtn.addEventListener("click", () => {
  pixModal.classList.add("hidden");
  pixModal.setAttribute("aria-hidden","true");
});

// clicar fora fecha modal
pixModal.addEventListener("click", (e) => {
  if(e.target === pixModal){
    pixModal.classList.add("hidden");
    pixModal.setAttribute("aria-hidden","true");
  }
});

// botão prosseguir (validação + fluxo PIX ou direto)
btnProceed.addEventListener("click", () => {
  // leitura
  const name = clientNameInput.value.trim();
  const phone = clientPhoneInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;
  const selected = Array.from(document.querySelectorAll(".service-checkbox")).filter(c => c.checked);
  const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || "PIX";

  if(!name || !phone || !date || !time || selected.length === 0) {
    alert("Por favor, preencha nome, telefone, data, horário e selecione ao menos um serviço.");
    return;
  }

  // total
  const total = calculateTotal();

  // se PIX: mostra modal com QR e chave (cliente paga e depois confirma)
  if(paymentMethod === "PIX"){
    pixQrImg.src = generateQrImage(pixKey);
    pixKeyInput.value = pixKey;
    pixModal.classList.remove("hidden");
    pixModal.setAttribute("aria-hidden","false");
    // guardar dados no botão de confirmar (dataset)
    confirmSendBtn.dataset.name = name;
    confirmSendBtn.dataset.phone = phone;
    confirmSendBtn.dataset.date = date;
    confirmSendBtn.dataset.time = time;
    confirmSendBtn.dataset.services = selected.map(s => s.dataset.name).join(', ');
    confirmSendBtn.dataset.total = total.toFixed(2);
    confirmSendBtn.dataset.payment = "PIX";
    return;
  }

  // se dinheiro ou cartão: enviar direto para WhatsApp
  const msg = buildMessage({
    name, phone, date, time,
    services: selected.map(s => s.dataset.name),
    total: total.toFixed(2),
    payment: paymentMethod
  });

  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
});

// confirmar envio dentro do modal PIX
confirmSendBtn.addEventListener("click", () => {
  const name = confirmSendBtn.dataset.name;
  const phone = confirmSendBtn.dataset.phone;
  const date = confirmSendBtn.dataset.date;
  const time = confirmSendBtn.dataset.time;
  const services = confirmSendBtn.dataset.services;
  const total = confirmSendBtn.dataset.total;
  const payment = confirmSendBtn.dataset.payment;

  const msg = buildMessage({
    name,
    phone,
    date,
    time,
    services: services.split(',').map(s => s.trim()),
    total,
    payment
  });

  // Ao abrir o WhatsApp a conversa estará pronta; o cliente pode anexar comprovante manualmente.
  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
  // fechar modal
  pixModal.classList.add("hidden");
  pixModal.setAttribute("aria-hidden","true");
});

// construir a mensagem para WhatsApp (texto claro)
function buildMessage({name, phone, date, time, services, total, payment}) {
  const servicesText = Array.isArray(services) ? services.join(', ') : services;
  // date pode estar em YYYY-MM-DD; deixar mais legível:
  const formattedDate = date ? date : '';
  const formattedTime = time ? time : '';
  return `💈 *Novo Agendamento - Barbearia Nego Brabo* 💈\n\n` +
         `👤 Nome: ${name}\n` +
         `📞 WhatsApp: ${phone}\n` +
         `📅 Data: ${formattedDate}\n` +
         `⏰ Horário: ${formattedTime}\n` +
         `✂️ Serviços: ${servicesText}\n` +
         `💰 Total: R$ ${Number(total).toFixed(2).replace('.',',')}\n` +
         `💳 Forma de pagamento: ${payment}\n\n` +
         (payment === "PIX" ? `🔁 Pagamento via PIX - chave: ${pixKey}\n(Anexe o comprovante na conversa quando pagar)` : '') +
         `\nPor favor, confirme o pagamento e aguarde a confirmação do horário. Obrigado!`;
}
