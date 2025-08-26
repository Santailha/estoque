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
let db;

const currentPage = window.location.pathname.split('/').pop();

auth.onAuthStateChanged(user => {
    if (user) {
        if (currentPage === 'index.html' || currentPage === '') {
            window.location.href = 'dashboard.html';
        }
    } else {
        // Se não estiver logado, redireciona para o index, a menos que já esteja lá
        if (currentPage !== 'index.html' && currentPage !== '') {
            window.location.href = 'index.html';
        }
    }
});


// --- LÓGICA DA TELA DE LOGIN ---
if (currentPage === 'index.html' || currentPage === '') {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            auth.signInWithEmailAndPassword(email, password)
                .then(() => window.location.href = 'dashboard.html')
                .catch(error => {
                    errorMessage.textContent = 'E-mail ou senha inválidos.';
                    console.error("Erro no login:", error);
                });
        });
    }
}


// --- LÓGICA DO DASHBOARD ---
if (currentPage === 'dashboard.html') {
    db = firebase.firestore();

    const logoutButton = document.getElementById('logout-button');
    const addItemForm = document.getElementById('add-item-form');
    const stockTableBody = document.querySelector('#stock-table tbody');
    
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const movementForm = document.getElementById('movement-form');
    const modalItemId = document.getElementById('modal-item-id');
    const modalQuantity = document.getElementById('modal-quantity');
    const modalSector = document.getElementById('modal-sector');
    const closeButton = modal.querySelector('.close-button');

    const historyModal = document.getElementById('history-modal');
    const historyModalTitle = document.getElementById('history-modal-title');
    const historyTableBody = document.getElementById('history-table-body');
    const historyCloseButton = historyModal.querySelector('.close-button');

    let currentMovementType = '';

    if(logoutButton) logoutButton.addEventListener('click', () => auth.signOut());

    if(addItemForm) {
        addItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const itemName = document.getElementById('item-name').value;
            const itemQuantity = parseInt(document.getElementById('item-quantity').value);

            db.collection('estoque').add({ nome: itemName, quantidade: itemQuantity })
              .then(() => addItemForm.reset())
              .catch(error => console.error("Erro ao adicionar item: ", error));
        });
    }

    if (stockTableBody) {
        db.collection('estoque').orderBy('nome').onSnapshot(snapshot => {
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
                        <td class="history-cell">
                            <button class="btn-historico" data-id="${doc.id}" data-nome="${item.nome}">🔍</button>
                        </td>
                    </tr>
                `;
                stockTableBody.innerHTML += row;
            });
        });
    }
    
    if(stockTableBody) {
        stockTableBody.addEventListener('click', (e) => {
            const target = e.target;
            const itemId = target.dataset.id;
            const itemName = target.dataset.nome;

            if (target.classList.contains('btn-entrada') || target.classList.contains('btn-saida')) {
                modalItemId.value = itemId;
                currentMovementType = target.classList.contains('btn-entrada') ? 'entrada' : 'saida';
                modalTitle.textContent = `Registrar ${currentMovementType === 'entrada' ? 'Entrada' : 'Saída'} para: ${itemName}`;
                modalSector.style.display = currentMovementType === 'saida' ? 'block' : 'none';
                modalSector.required = currentMovementType === 'saida';
                modal.style.display = 'block';
            }

            if (target.classList.contains('btn-historico')) {
                showHistory(itemId, itemName);
            }
        });
    }

    function showHistory(itemId, itemName) {
        historyModalTitle.textContent = `Histórico de: ${itemName}`;
        historyTableBody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
        historyModal.style.display = 'block';

        db.collection('movimentacoes').where('itemId', '==', itemId).orderBy('data', 'desc').get()
          .then(snapshot => {
              if (snapshot.empty) {
                  historyTableBody.innerHTML = '<tr><td colspan="4">Nenhuma movimentação encontrada.</td></tr>';
                  return;
              }
              historyTableBody.innerHTML = '';
              snapshot.forEach(doc => {
                  const mov = doc.data();
                  const data = mov.data ? mov.data.toDate().toLocaleString('pt-BR') : 'Data inválida';
                  const tipo = mov.tipo === 'entrada' ? '✅ Entrada' : '❌ Saída';
                  const setor = mov.setor || '-';
                  historyTableBody.innerHTML += `<tr><td>${data}</td><td>${tipo}</td><td>${mov.quantidade}</td><td>${setor}</td></tr>`;
              });
          })
          .catch(error => {
              console.error("Erro ao buscar histórico: ", error);
              historyTableBody.innerHTML = '<tr><td colspan="4">Erro ao carregar o histórico.</td></tr>';
          });
    }

    if(closeButton) closeButton.onclick = () => { modal.style.display = 'none'; movementForm.reset(); };
    if(historyCloseButton) historyCloseButton.onclick = () => { historyModal.style.display = 'none'; };
    
    window.onclick = (event) => {
        if (event.target == modal) { modal.style.display = 'none'; movementForm.reset(); }
        if (event.target == historyModal) { historyModal.style.display = 'none'; }
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
                    let newQuantity = doc.data().quantidade + (currentMovementType === 'entrada' ? quantity : -quantity);
                    if (newQuantity < 0) { alert("Erro: Estoque insuficiente!"); throw "Estoque insuficiente!"; }
                    
                    transaction.update(itemRef, { quantidade: newQuantity });
                    const movRef = db.collection('movimentacoes').doc();
                    const logData = { itemId, nomeItem: doc.data().nome, tipo: currentMovementType, quantidade: quantity, data: firebase.firestore.FieldValue.serverTimestamp() };
                    if (currentMovementType === 'saida') logData.setor = sector;
                    transaction.set(movRef, logData);
                });
            }).then(() => {
                modal.style.display = 'none';
                movementForm.reset();
            }).catch(error => console.error("Erro na transação: ", error));
        });
    }
}


// --- LÓGICA DO RELATÓRIO ---
if (currentPage === 'relatorio.html') {
    db = firebase.firestore();

    const logoutButton = document.getElementById('logout-button');
    const filterForm = document.getElementById('filter-form');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const reportResults = document.getElementById('report-results');
    const totalEntradasElem = document.getElementById('total-entradas');
    const totalSaidasElem = document.getElementById('total-saidas');
    const reportTableBody = document.getElementById('report-table-body');

    if (logoutButton) logoutButton.addEventListener('click', () => auth.signOut());

    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Adiciona a hora inicial (00:00:00) e final (23:59:59) para incluir o dia todo
            const startDate = new Date(startDateInput.value + 'T00:00:00');
            const endDate = new Date(endDateInput.value + 'T23:59:59');

            if (endDate < startDate) {
                alert('A data final não pode ser anterior à data de início.');
                return;
            }

            // Converte para Timestamps do Firebase
            const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
            const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);

            generateReport(startTimestamp, endTimestamp);
        });
    }

    function generateReport(start, end) {
        reportTableBody.innerHTML = '<tr><td colspan="5">Gerando relatório...</td></tr>';
        reportResults.style.display = 'block';
        let totalEntradas = 0;
        let totalSaidas = 0;

        db.collection('movimentacoes')
          .where('data', '>=', start)
          .where('data', '<=', end)
          .orderBy('data', 'desc')
          .get()
          .then(snapshot => {
              if (snapshot.empty) {
                  reportTableBody.innerHTML = '<tr><td colspan="5">Nenhuma movimentação encontrada no período.</td></tr>';
                  totalEntradasElem.textContent = 0;
                  totalSaidasElem.textContent = 0;
                  return;
              }

              reportTableBody.innerHTML = '';
              snapshot.forEach(doc => {
                  const mov = doc.data();
                  
                  if (mov.tipo === 'entrada') {
                      totalEntradas += mov.quantidade;
                  } else {
                      totalSaidas += mov.quantidade;
                  }

                  const data = mov.data ? mov.data.toDate().toLocaleString('pt-BR') : 'Data inválida';
                  const tipo = mov.tipo === 'entrada' ? '✅ Entrada' : '❌ Saída';
                  const setor = mov.setor || '-';
                  reportTableBody.innerHTML += `<tr><td>${data}</td><td>${mov.nomeItem}</td><td>${tipo}</td><td>${mov.quantidade}</td><td>${setor}</td></tr>`;
              });
              
              totalEntradasElem.textContent = totalEntradas;
              totalSaidasElem.textContent = totalSaidas;
          })
          .catch(error => {
              console.error("Erro ao gerar relatório: ", error);
              reportTableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar o relatório. Verifique o console.</td></tr>';
          });
    }
}
