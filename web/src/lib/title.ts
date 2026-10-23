let base = 'SmartCC';
let unread = 0;
const apply = () => { document.title = `${unread ? `(${unread > 99 ? '99+' : unread}) ` : ''}${base}`; };

/** Page part of the tab title ("My tickets · SmartCC"). */
export const setPageTitle = (title: string) => { base = `${title} · SmartCC`; apply(); };
/** Unread notifications prefix: "(2) My tickets · SmartCC". */
export const setUnreadTitle = (n: number) => { unread = n; apply(); };
