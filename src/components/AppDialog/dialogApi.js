let impl = {
    alert: async (message) => {
        if (typeof window !== 'undefined') window.alert(String(message ?? ''));
    },
    confirm: async (message) => {
        if (typeof window === 'undefined') return false;
        return window.confirm(String(message ?? ''));
    },
};

export function setDialogImpl(next) {
    impl = next;
}

export function appAlert(message, options = {}) {
    return impl.alert(message, options);
}

export function appConfirm(message, options = {}) {
    return impl.confirm(message, options);
}
