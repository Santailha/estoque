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
const auth = firebase.auth();
const db = firebase.firestore();

// --- LÓGICA GERAL E AUTENTICAÇÃO ---

const currentPage = window.location.pathname.split('/').pop();

auth.onAuthStateChanged(user => {
    if (user) {
        // Se o usuário está logado e na tela de login, redireciona para o dashboard
        if (currentPage === 'index.html' || currentPage === '') {
            window.location.href = 'dashboard.html';
        }
    } else {
        // Se o usuário não está logado e está em qualquer página que não seja a de login, redireciona para o login
        if (currentPage !== 'index.html' && currentPage !== '') {
            window.location.href = 'index.html';
        }
    }
});

// --- LÓGICA DA TELA DE LOGIN (index.html) ---

if (currentPage === 'index.html' || currentPage === '') {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Login bem-sucedido, onAuthStateChanged vai redirecionar
            })
            .catch((error) => {
                errorMessage.textContent = 'E-mail ou senha inválidos.';
                console.error("Erro no login:", error);
            });
    });
}

// --- LÓGICA DO DASHBOARD (dashboard.html) ---

if (currentPage === 'dashboard.html') {
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
    const modalSubmitButton = document.getElementById('modal-submit-button');
    const closeButton = document.querySelector('.close-button');

    let currentMovementType = ''; // 'entrada' ou 'saida'

    // Logout
    logoutButton.addEventListener('click', () => {
        auth.signOut();
    });

    // Adicionar novo item
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

    // Listar itens em tempo real
    db.collection('estoque').onSnapshot(snapshot => {
        stockTableBody.innerHTML = ''; // Limpa a tabela antes de recarregar
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
    
    // Abrir Modal para entrada ou saída
    stockTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-entrada') || e.target.classList.contains('btn-saida')) {
            const itemId = e.target.dataset.id;
            const itemName = e.target.dataset.nome;
            
            modalItemId.value = itemId;
            
            if (e.target.classList.contains('btn-entrada')) {
                currentMovementType = 'entrada';
                modalTitle.textContent = `Registrar Entrada para: ${itemName}`;
                modalSector.style.display = 'none'; // Esconde o campo de setor para entradas
                modalSector.required = false;
            } else {
                currentMovementType = 'saida';
                modalTitle.textContent = `Registrar Saída para: ${itemName}`;
                modalSector.style.display = 'block'; // Mostra o campo de setor para saídas
                modalSector.required = true;
            }
            
            modal.style.display = 'block';
        }
    });

    // Fechar Modal
    closeButton.onclick = () => {
        modal.style.display = 'none';
        movementForm.reset();
    };
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
            movementForm.reset();
        }
    };
    
    // Registrar movimentação (submissão do form do modal)
    movementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const itemId = modalItemId.value;
        const quantity = parseInt(modalQuantity.value);
        const sector = modalSector.value;
        
        const itemRef = db.collection('estoque').doc(itemId);
        
        db.runTransaction(transaction => {
            return transaction.get(itemRef).then(doc => {
                if (!doc.exists) {
                    throw "Documento não existe!";
                }

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

                // Registra na coleção de movimentações
                const movRef = db.collection('movimentacoes').doc();
                const logData = {
                    itemId: itemId,
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
