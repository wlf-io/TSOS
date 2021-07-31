import { System } from "./System";

(() => {

    const ready = (fn: () => void) => {
        if (document.readyState != 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }

    };

    ready(() => System.boot());

})();
