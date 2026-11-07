// Configuração do seu projeto Firebase
console.log("O app.js rodou com sucesso!");
const firebaseConfig = {
    apiKey: "AIzaSyBSK604aY00C5dncxxDD-wSti5nwAvGth4",
    authDomain: "cardapio-castro.firebaseapp.com",
    projectId: "cardapio-castro",
    storageBucket: "cardapio-castro.firebasestorage.app",
    messagingSenderId: "129401356172",
    appId: "1:129401356172:web:4a7ebaad6673ec930ba0a9",
    measurementId: "G-X2X8CRBMM5"
  };
  
  // Inicializar Firebase (Versão compat)
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  let cart = [];
  
  // Alternar janelas modais (Janela de Login)
  window.toggleModal = (id) => {
    document.getElementById(id).classList.toggle('hidden');
  };
  
  // Converter imagem local do computador em Base64 para salvar no banco
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
  
  // Monitorar se você está logada como Admin ou como Cliente
  auth.onAuthStateChanged((user) => {
    const adminPanel = document.getElementById('admin-panel');
    const btnLogin = document.getElementById('btn-open-login');
    if (user) {
      adminPanel.classList.remove('hidden');
      btnLogin.innerText = "Admin Ativo";
    } else {
      adminPanel.classList.add('hidden');
      btnLogin.innerText = "Área Admin";
    }
    loadProducts();
  });
  
  window.loginAdmin = async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    try {
      await auth.signInWithEmailAndPassword(email, pass);
      toggleModal('modal-login');
      alert("Login realizado com sucesso!");
    } catch (err) {
      alert("Erro ao fazer login: " + err.message);
    }
  };
  
  window.logoutAdmin = () => auth.signOut();
  
  // Carregar Dados da Loja (Nome e Logo personalizados)
  const loadStoreData = async () => {
    try {
      const docSnap = await db.collection("config").doc("store").get();
      if (docSnap.exists) {
        const data = docSnap.data();
        document.getElementById('store-name').innerText = data.name || "Castro Personalizados";
        if (data.logo) document.getElementById('store-logo').src = data.logo;
      }
    } catch (e) {
      console.log("Aguardando criação da coleção config no Firestore.");
    }
  };
  loadStoreData();
  
  window.saveStoreInfo = async () => {
    const name = document.getElementById('input-store-name').value;
    const logoFile = document.getElementById('input-store-logo').files[0];
    let logoBase64 = null;
  
    if (logoFile) {
      logoBase64 = await fileToBase64(logoFile);
    }
  
    const payload = {};
    if (name) payload.name = name;
    if (logoBase64) payload.logo = logoBase64;
  
    await db.collection("config").doc("store").set(payload, { merge: true });
    alert("Informações da loja atualizadas com sucesso!");
    loadStoreData();
  };
  
  // Cadastrar Produto (Nome, Preço e Foto do Computador)
  window.addProduct = async () => {
    const title = document.getElementById('input-prod-title').value;
    const price = parseFloat(document.getElementById('input-prod-price').value);
    const imgFile = document.getElementById('input-prod-img').files[0];
  
    if (!title || isNaN(price)) return alert("Preencha o título e o preço corretamente.");
  
    let imgBase64 = "https://via.placeholder.com/150";
    if (imgFile) {
      imgBase64 = await fileToBase64(imgFile);
    }
  
    await db.collection("products").add({ title, price, img: imgBase64 });
    alert("Produto cadastrado com sucesso!");
    document.getElementById('input-prod-title').value = '';
    document.getElementById('input-prod-price').value = '';
    document.getElementById('input-prod-img').value = '';
  };
  
  // Apagar Produto (Apenas para o Admin logado)
  window.deleteProduct = async (id) => {
    if (confirm("Deseja realmente apagar este produto do cardápio?")) {
      await db.collection("products").doc(id).delete();
    }
  };
  
  // Listar Produtos em Tempo Real na tela do Cliente e Admin
  function loadProducts() {
    db.collection("products").onSnapshot((snapshot) => {
      const container = document.getElementById('products-list');
      container.innerHTML = '';
      
      if (snapshot.empty) {
        container.innerHTML = `<p class="text-gray-500 text-sm col-span-2 text-center py-6">Nenhum produto cadastrado ainda. Faça login na Área Admin para adicionar!</p>`;
        return;
      }
  
      snapshot.forEach((docSnap) => {
        const prod = docSnap.data();
        const id = docSnap.id;
        const isAdmin = auth.currentUser !== null;
  
        const div = document.createElement('div');
        div.className = "bg-white p-3 rounded-lg border shadow-sm flex space-x-3 items-center relative product-card";
        div.innerHTML = `
          <img src="${prod.img}" class="w-20 h-20 rounded-md object-cover border" />
          <div class="flex-1">
            <h4 class="font-semibold text-gray-800 text-sm">${prod.title}</h4>
            <p class="text-green-600 font-bold text-sm mt-1">R$ ${prod.price.toFixed(2)}</p>
            <button onclick="addToCart('${prod.title}', ${prod.price})" class="mt-2 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1 rounded">
              + Adicionar
            </button>
          </div>
          ${isAdmin ? `<button onclick="deleteProduct('${id}')" class="absolute top-2 right-2 text-red-500 text-xs font-bold bg-red-50 hover:bg-red-100 p-1.5 rounded">✕</button>` : ''}
        `;
        container.appendChild(div);
      });
    });
  }
  
  // Lógica do Carrinho do Cliente
  window.addToCart = (title, price) => {
    cart.push({ title, price });
    updateCartUI();
  };
  
  function updateCartUI() {
    const total = cart.reduce((acc, item) => acc + item.price, 0);
    document.getElementById('cart-total').innerText = `R$ ${total.toFixed(2)}`;
  }
  
  // Enviar pedido fechado pelo cliente direto para o WhatsApp da loja
  window.checkoutWhatsApp = () => {
    if (cart.length === 0) return alert("Seu carrinho está vazio! Adicione itens antes de finalizar.");
    
    const text = cart.map(i => `• ${i.title} (R$ ${i.price.toFixed(2)})`).join('\n');
    const total = cart.reduce((acc, item) => acc + item.price, 0);
    const msg = encodeURIComponent(`*Novo Pedido - Panificadora Alvorada:*\n\n${text}\n\n*Total:* R$ ${total.toFixed(2)}`);
    
    // Substitua abaixo pelo seu número de WhatsApp com DDI e DDD (Ex: 5561999999999)
    const phone = "5561993989639"; 
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };
