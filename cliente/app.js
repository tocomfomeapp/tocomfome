const CLIENTE_KEY = 'sistema_pedidos_cliente';

function salvarCliente(telefone, dados) {
    const cliente = {
        telefone: telefone,
        ...dados
    };
    localStorage.setItem(CLIENTE_KEY, JSON.stringify(cliente));
    localStorage.setItem('sistema_pedidos_logado', 'true');
}

function getCliente() {
    const dados = localStorage.getItem(CLIENTE_KEY);
    if (dados) {
        try {
            return JSON.parse(dados);
        } catch (e) {
            return null;
        }
    }
    return null;
}

function logout() {
    localStorage.removeItem(CLIENTE_KEY);
    localStorage.removeItem('sistema_pedidos_logado');
    localStorage.removeItem('carrinho');
    localStorage.removeItem('tipoPedido');
    localStorage.removeItem('ultimoPedidoId');
}

function limparTelefone(telefone) {
    return telefone.replace(/\D/g, '');
}

function formatarTelefone(telefone) {
    const limpo = limparTelefone(telefone);
    if (limpo.length === 11) {
        return `(${limpo.substring(0, 2)}) ${limpo.substring(2, 7)}-${limpo.substring(7)}`;
    }
    return telefone;
}

function telefoneValido(telefone) {
    const limpo = limparTelefone(telefone);

    // Verificar comprimento
    if (limpo.length < 10 || limpo.length > 11) {
        return false;
    }

    // Verificar se não é apenas números repetidos
    if (/^(\d)\1+$/.test(limpo)) {
        return false; // Ex: 00000000000, 11111111111
    }

    // Verificar se começa com dígito válido (não 0)
    if (limpo[0] === '0') {
        return false;
    }

    return true;
}

function showError(mensagem) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = mensagem;
        errorEl.style.display = 'block';
    }
}

function showToast(mensagem, tipo = 'success') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = mensagem;
        toast.className = `toast ${tipo}`;
        toast.style.display = 'block';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

const ServiceWorkerUtils = {
    registration: null,

    async init() {
        if ('serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registrado:', this.registration.scope);

                this.registration.addEventListener('updatefound', () => {
                    const newWorker = this.registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                if (confirm('Nova versão disponível! Deseja atualizar?')) {
                                    window.location.reload();
                                }
                            }
                        });
                    }
                });

                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('🔄 Service Worker controller mudou');
                });

                return true;
            } catch (error) {
                console.error('❌ Erro ao registrar Service Worker:', error);
                return false;
            }
        }
        return false;
    },

    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('Este browser não suporta notificações');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    },

    sendMessage(data) {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage(data);
        }
    },

    async subscribeToPush() {
        if (!this.registration) {
            await this.init();
        }

        if (!this.registration) {
            console.warn('Service Worker não disponível');
            return null;
        }

        try {
            let subscription = await this.registration.pushManager.getSubscription();

            if (!subscription) {
                const permission = await this.requestPermission();
                if (!permission) {
                    console.warn('Permissão de notificação negada');
                    return null;
                }

                subscription = await this.registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
                });
            }

            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription)
            });

            console.log('✅ Inscrito em Push Notifications');
            return subscription;
        } catch (error) {
            console.error('❌ Erro ao inscrever em Push:', error);
            return null;
        }
    },

    onMessage(callback) {
        if (navigator.serviceWorker) {
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
                    callback(event.data);
                }
            });
        }
    }
};

async function initServiceWorker() {
    await ServiceWorkerUtils.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initServiceWorker);
} else {
    initServiceWorker();
}
