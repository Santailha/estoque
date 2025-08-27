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
        if (currentPage !== 'index.html' && currentPage !== '') {
            window.location.href = 'index.html';
        }
    }
});


// --- LÓGICA DA TELA DE LOGIN ---
if (currentPage === 'index.html' || currentPage === '') {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            auth.signInWithEmailAndPassword(email, password)
                .then(() => window.location.href = 'dashboard.html')
                .catch(error => {
                    document.getElementById('error-message').textContent = 'E-mail ou senha inválidos.';
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
    const searchStockInput = document.getElementById('search-stock');

    const modal = document.getElementById('modal');
    const movementForm = document.getElementById('movement-form');
    const historyModal = document.getElementById('history-modal');

    if(logoutButton) logoutButton.addEventListener('click', () => auth.signOut());

    if(addItemForm) {
        // --- LÓGICA MODIFICADA PARA ADICIONAR ITEM ---
        addItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const itemName = document.getElementById('item-name').value;
            const itemQuantity = parseInt(document.getElementById('item-quantity').value);
            const itemUnidade = document.getElementById('item-unidade').value; // CAMPO NOVO

            if (!itemUnidade) {
                alert('Por favor, selecione uma unidade.');
                return;
            }

            db.collection('estoque').add({
                nome: itemName,
                quantidade: itemQuantity,
                unidade: itemUnidade // DADO NOVO
            })
              .then(() => addItemForm.reset())
              .catch(error => console.error("Erro ao adicionar item: ", error));
        });
    }

    if(searchStockInput) {
        searchStockInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = stockTableBody.getElementsByTagName('tr');
            Array.from(rows).forEach(row => {
                const itemName = row.getElementsByTagName('td')[0].textContent.toLowerCase();
                if (itemName.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    if (stockTableBody) {
        // --- LÓGICA MODIFICADA PARA EXIBIR A TABELA DE ESTOQUE ---
        db.collection('estoque').orderBy('nome').onSnapshot(snapshot => {
            stockTableBody.innerHTML = '';
            snapshot.forEach(doc => {
                const item = doc.data();
                const row = `
                    <tr>
                        <td>${item.nome}</td>
                        <td>${item.unidade}</td> <td>${item.quantidade}</td>
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
            // Re-aplica o filtro caso a lista seja atualizada
            if (searchStockInput.value) {
                searchStockInput.dispatchEvent(new Event('input'));
            }
        });
    }
    
    const modalTitle = document.getElementById('modal-title');
    const closeButton = modal.querySelector('.close-button');
    const historyModalTitle = document.getElementById('history-modal-title');
    const historyTableBody = document.getElementById('history-table-body');
    const historyCloseButton = historyModal.querySelector('.close-button');
    let currentMovementType = '';

    if(stockTableBody) {
        stockTableBody.addEventListener('click', (e) => {
            const target = e.target;
            const itemId = target.dataset.id;
            const itemName = target.dataset.nome;

            if (target.classList.contains('btn-entrada') || target.classList.contains('btn-saida')) {
                const modalItemId = document.getElementById('modal-item-id');
                modalItemId.value = itemId;
                currentMovementType = target.classList.contains('btn-entrada') ? 'entrada' : 'saida';
                modalTitle.textContent = `Registrar ${currentMovementType === 'entrada' ? 'Entrada' : 'Saída'} para: ${itemName}`;
                const modalSector = document.getElementById('modal-sector');
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
        // --- LÓGICA MODIFICADA PARA REGISTRAR MOVIMENTAÇÃO ---
        movementForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const itemId = document.getElementById('modal-item-id').value;
            const quantity = parseInt(document.getElementById('modal-quantity').value);
            const sector = document.getElementById('modal-sector').value;
            const itemRef = db.collection('estoque').doc(itemId);
            
            db.runTransaction(transaction => {
                return transaction.get(itemRef).then(doc => {
                    if (!doc.exists) throw "Documento não existe!";
                    
                    const itemData = doc.data();
                    let newQuantity = itemData.quantidade + (currentMovementType === 'entrada' ? quantity : -quantity);
                    if (newQuantity < 0) { 
                        alert("Erro: Estoque insuficiente!"); 
                        throw "Estoque insuficiente!"; 
                    }
                    
                    transaction.update(itemRef, { quantidade: newQuantity });

                    const movRef = db.collection('movimentacoes').doc();
                    const logData = { 
                        itemId, 
                        nomeItem: itemData.nome, 
                        unidade: itemData.unidade, // DADO NOVO REGISTRADO NA MOVIMENTAÇÃO
                        tipo: currentMovementType, 
                        quantidade: quantity, 
                        data: firebase.firestore.FieldValue.serverTimestamp() 
                    };
                    if (currentMovementType === 'saida') logData.setor = sector;
                    
                    transaction.set(movRef, logData);
                });
            }).then(() => {
                modal.style.display = 'none';
                movementForm.reset();
            }).catch(error => {
                console.error("Erro na transação: ", error);
                if (error !== "Estoque insuficiente!") {
                    alert("Ocorreu um erro ao registrar a movimentação.");
                }
            });
        });
    }

}


// --- LÓGICA DO RELATÓRIO ---
if (currentPage === 'relatorio.html') {
    db = firebase.firestore();

    const logoutButton = document.getElementById('logout-button');
    const filterForm = document.getElementById('filter-form');
    const searchReportInput = document.getElementById('search-report');
    const reportResults = document.getElementById('report-results');
    const totalEntradasElem = document.getElementById('total-entradas');
    const totalSaidasElem = document.getElementById('total-saidas');
    const reportTableBody = document.getElementById('report-table-body');
    let reportData = [];

    if (logoutButton) logoutButton.addEventListener('click', () => auth.signOut());

    if (filterForm) {
        // --- LÓGICA MODIFICADA PARA GERAR RELATÓRIO ---
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const startDate = new Date(document.getElementById('start-date').value + 'T00:00:00');
            const endDate = new Date(document.getElementById('end-date').value + 'T23:59:59');
            const unidade = document.getElementById('unidade-filter').value; // CAMPO NOVO

            if (endDate < startDate) return alert('A data final não pode ser anterior à data de início.');

            generateReport(
                firebase.firestore.Timestamp.fromDate(startDate),
                firebase.firestore.Timestamp.fromDate(endDate),
                unidade
            );
        });
    }

    if(searchReportInput) {
        searchReportInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredData = reportData.filter(mov => mov.nomeItem.toLowerCase().includes(searchTerm));
            renderReportTable(filteredData);
        });
    }

    function generateReport(start, end, unidade) {
        reportTableBody.innerHTML = '<tr><td colspan="6">Gerando relatório...</td></tr>';
        reportResults.style.display = 'block';

        let query = db.collection('movimentacoes')
                      .where('data', '>=', start)
                      .where('data', '<=', end);

        // Adiciona o filtro de unidade à consulta se não for "todas"
        if (unidade !== 'todas') {
            query = query.where('unidade', '==', unidade);
        }
        
        query.orderBy('data', 'desc').get()
          .then(snapshot => {
              reportData = [];
              snapshot.forEach(doc => reportData.push(doc.data()));
              renderReportTable(reportData);
          })
          .catch(error => {
              console.error("Erro ao gerar relatório: ", error);
              reportTableBody.innerHTML = '<tr><td colspan="6">Erro ao carregar o relatório. Verifique o console.</td></tr>';
          });
    }

    function renderReportTable(data) {
        let totalEntradas = 0;
        let totalSaidas = 0;
        reportTableBody.innerHTML = '';

        if (data.length === 0) {
            reportTableBody.innerHTML = '<tr><td colspan="6">Nenhuma movimentação encontrada para os filtros selecionados.</td></tr>';
            totalEntradasElem.textContent = 0;
            totalSaidasElem.textContent = 0;
            return;
        }

        data.forEach(mov => {
            if (mov.tipo === 'entrada') totalEntradas += mov.quantidade;
            else totalSaidas += mov.quantidade;
            
            const dataStr = mov.data ? mov.data.toDate().toLocaleString('pt-BR') : 'Data inválida';
            const tipo = mov.tipo === 'entrada' ? '✅ Entrada' : '❌ Saída';
            const setor = mov.setor || '-';
            const unidade = mov.unidade || '-'; // Exibe a unidade
            reportTableBody.innerHTML += `<tr><td>${dataStr}</td><td>${mov.nomeItem}</td><td>${unidade}</td><td>${tipo}</td><td>${mov.quantidade}</td><td>${setor}</td></tr>`;
        });

        totalEntradasElem.textContent = totalEntradas;
        totalSaidasElem.textContent = totalSaidas;
    }
}
