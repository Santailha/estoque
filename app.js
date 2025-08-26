const firebaseConfig = {
  apiKey: "AIzaSyBoAxno3WU0XxqgG5An4QgRsnUhiqJytJg",
  authDomain: "estoque-produtos-ee79e.firebaseapp.com",
  projectId: "estoque-produtos-ee79e",
  storageBucket: "estoque-produtos-ee79e.firebasestorage.app",
  messagingSenderId: "104213962376",
  appId: "1:104213962376:web:49c93a7966a930445b893d"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Obtém os serviços que vamos usar
const auth = firebase.auth();
let db; // Declarado aqui, mas inicializado depois

// --- LÓGICA GERAL E AUTENTICAÇÃO ---
const currentPage = window.location.pathname.split('/').pop();

auth.onAuthStateChanged(user => {
    if (user) {
        if (currentPage === 'index.html' || currentPage === '') {
            window.location.href = 'dashboard.html';
        }
    } else {
        if (currentPage !== 'index.html' && currentPage !== '') {
            window.location.href = 'index.html';
        }
    }
});

// --- LÓGICA DA TELA DE LOGIN (index.html) ---
if (currentPage === 'index.html' || currentPage === '') {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    errorMessage.textContent = 'E-mail ou senha inválidos.';
                    console.error("Erro no login:", error);
                });
        });
    }
}

// --- LÓGICA DO DASHBOARD (dashboard.html) ---
if (currentPage === 'dashboard.html') {
    // *** CORREÇÃO APLICADA AQUI ***
    // Inicializa o Firestore apenas na página do dashboard
    db = firebase.firestore();

    const logoutButton = document.getElementById('logout-button');
    const addItemForm = document.getElementById('add-item-form');
    const stockTableBody = document.querySelector('#stock-table tbody');
    
    // Modal elements
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const movementForm = document.getElementById('movement-form');
    const modalItemId = document.getElementById('modal-item-id');
    const modalQuantity = document.getElementById('modal-quantity');
    const modalSector = document.getElementById('modal-sector');
    const closeButton = document.querySelector('.close-button');

    let currentMovementType = '';

    if(logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut();
        });
    }

    if(addItemForm) {
        addItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const itemName = document.getElementById('item-name').value;
            const itemQuantity = parseInt(document.getElementById('item-quantity').value);

            db.collection('estoque').add({
                nome: itemName,
                quantidade: itemQuantity
            }).then(() => {
                console.log("Item adicionado com sucesso!");
                addItemForm.reset();
            }).catch(error => {
                console.error("Erro ao adicionar item: ", error);
            });
        });
    }

    if (stockTableBody) {
        db.collection('estoque').onSnapshot(snapshot => {
            stockTableBody.innerHTML = '';
            snapshot.forEach(doc => {
                const item = doc.data();
                const row = `
                    <tr>
                        <td>${item.nome}</td>
                        <td>${item.quantidade}</td>
                        <td class="action-buttons">
                            <button class="btn-entrada" data-id="${doc.id}" data-nome="${item.nome}">+ Entrada</button>
                            <button class="btn-saida" data-id="${doc.id}" data-nome="${item.nome}">- Saída</button>
                        </td>
                    </tr>
                `;
                stockTableBody.innerHTML += row;
            });
        });
    }
    
    if(stockTableBody) {
        stockTableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-entrada') || e.target.classList.contains('btn-saida')) {
                const itemId = e.target.dataset.id;
                const itemName = e.target.dataset.nome;
                
                modalItemId.value = itemId;
                
                if (e.target.classList.contains('btn-entrada')) {
                    currentMovementType = 'entrada';
                    modalTitle.textContent = `Registrar Entrada para: ${itemName}`;
                    modalSector.style.display = 'none';
                    modalSector.required = false;
                } else {
                    currentMovementType = 'saida';
                    modalTitle.textContent = `Registrar Saída para: ${itemName}`;
                    modalSector.style.display = 'block';
                    modalSector.required = true;
                }
                
                modal.style.display = 'block';
            }
        });
    }

    if(closeButton) {
        closeButton.onclick = () => {
            modal.style.display = 'none';
            movementForm.reset();
        };
    }
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
            movementForm.reset();
        }
    };
    
    if(movementForm){
        movementForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const itemId = modalItemId.value;
            const quantity = parseInt(modalQuantity.value);
            const sector = modalSector.value;
            
            const itemRef = db.collection('estoque').doc(itemId);
            
            db.runTransaction(transaction => {
                return transaction.get(itemRef).then(doc => {
                    if (!doc.exists) throw "Documento não existe!";

                    let newQuantity;
                    if (currentMovementType === 'saida') {
                        newQuantity = doc.data().quantidade - quantity;
                        if (newQuantity < 0) {
                            alert("Erro: Estoque insuficiente!");
                            throw "Estoque insuficiente!";
                        }
                    } else {
                        newQuantity = doc.data().quantidade + quantity;
                    }
                    
                    transaction.update(itemRef, { quantidade: newQuantity });

                    const movRef = db.collection('movimentacoes').doc();
                    const logData = {
                        itemId: itemId,
                        nomeItem: doc.data().nome,
                        tipo: currentMovementType,
                        quantidade: quantity,
                        data: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    if (currentMovementType === 'saida') {
                        logData.setor = sector;
                    }
                    transaction.set(movRef, logData);
                });
            }).then(() => {
                console.log("Transação concluída com sucesso!");
                modal.style.display = 'none';
                movementForm.reset();
            }).catch(error => {
                console.error("Erro na transação: ", error);
            });
        });
    }
}
