/* BizSim 7.3.0 icon set: duotone line icons (stroke + soft fill). Names missing here fall back to the earlier icon sets. */
(() => {
  if (typeof App === 'undefined') return;
  const f = d => `<path class="f" d="${d}"/>`, s = d => `<path d="${d}"/>`;
  const I = {
    home: f('M5 11l7-6 7 6v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z') + s('M3 12l9-8 9 8M10 20v-5h4v5'),
    dashboard: '<rect class="f" x="4" y="4" width="7" height="8" rx="2"/><rect x="13" y="4" width="7" height="5" rx="2"/><rect class="f" x="13" y="11" width="7" height="9" rx="2"/><rect x="4" y="14" width="7" height="6" rx="2"/>',
    briefcase: '<rect class="f" x="3" y="7" width="18" height="13" rx="2.5"/>' + s('M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18M10.5 12.5v2h3v-2'),
    store: f('M5 10v9h14v-9') + s('M3.5 10l1.6-5.5h13.8L20.5 10a2.6 2.6 0 0 1-5 0 2.6 2.6 0 0 1-5 0 2.6 2.6 0 0 1-5 0zM10 19v-5h4v5'),
    box: f('M4 8l8-4 8 4v9l-8 4-8-4z') + s('M4 8l8 4 8-4M12 12v9'),
    shield: f('M12 3l7 3v5.5c0 4.3-2.9 7.4-7 9.5-4.1-2.1-7-5.2-7-9.5V6z') + s('M12 3l7 3v5.5c0 4.3-2.9 7.4-7 9.5-4.1-2.1-7-5.2-7-9.5V6zM9 12l2.2 2.2L15.5 10'),
    wallet: f('M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z') + s('M4 7l11-3.5V7M16 14h4'),
    trend: s('M3.5 18.5h17') + s('M5 15l4.5-5 3.5 3L19 6.5') + s('M15 6.5h4v4'),
    chart: '<rect class="f" x="5" y="11" width="3.5" height="8" rx="1"/><rect class="f" x="10.3" y="7" width="3.5" height="12" rx="1"/><rect class="f" x="15.5" y="4" width="3.5" height="15" rx="1"/>' + s('M3.5 20.5h17'),
    pie: f('M12 4a8 8 0 1 0 8 8h-8z') + s('M12 4a8 8 0 1 0 8 8h-8zM14 3.6A8 8 0 0 1 20.4 10H14z'),
    users: '<circle class="f" cx="9" cy="8.5" r="3.4"/>' + s('M2.8 20c.5-3.6 3-5.6 6.2-5.6s5.7 2 6.2 5.6M16.5 5.6a3 3 0 0 1 0 5.8M18 14.6c2 .6 3.1 2.3 3.4 5.4'),
    user: '<circle class="f" cx="12" cy="8.5" r="3.7"/>' + s('M5 20c.6-3.8 3.4-6 7-6s6.4 2.2 7 6'),
    supply: f('M3 8l5-3 5 3v7l-5 3-5-3z') + s('M3 8l5 3 5-3M8 11v7M14 10h3.5l3 3.5V17H14M16 19.2a1.4 1.4 0 1 0 0-.01M20 19.2a1.4 1.4 0 1 0 0-.01'),
    bolt: f('M13 3L5 13.5h5.5L10 21l8-10.5h-5.5z') + s('M13 3L5 13.5h5.5L10 21l8-10.5h-5.5z'),
    compass: '<circle class="f" cx="12" cy="12" r="8.5"/>' + s('M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM15.5 8.5l-2 5-5 2 2-5z'),
    calendar: '<rect class="f" x="4" y="5" width="16" height="15" rx="2.5"/>' + s('M4 10h16M8 3v4M16 3v4M9.5 15l2 2 3.5-3.5'),
    bell: f('M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z') + s('M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 21h4'),
    settings: '<circle class="f" cx="12" cy="12" r="3"/>' + s('M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM12 3v2.4M12 18.6V21M4.6 7.5l2 1.2M17.4 15.3l2 1.2M4.6 16.5l2-1.2M17.4 8.7l2-1.2'),
    refresh: s('M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3M18.5 3v4h-4M5.5 21v-4h4'),
    menu: s('M4 7h16M4 12h16M4 17h10'),
    plus: s('M12 5v14M5 12h14'), close: s('M6 6l12 12M18 6L6 18'), check: s('M5 12.5l4.5 4.5L19 7.5'), search: '<circle class="f" cx="11" cy="11" r="6.5"/>' + s('M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM16 16l4.5 4.5'),
    arrow: s('M5 12h14M13 6l6 6-6 6'), up: s('M6 15l6-6 6 6'), down: s('M6 9l6 6 6-6'),
    land: f('M3.5 18.5l4-9h9l4 9z') + s('M3.5 18.5l4-9h9l4 9zM2.5 20.5h19M12 9.5V3.8l4.2 2L12 7.8M8 14.5h8'),
    landbuy: f('M3.5 18.5l4-9h9l4 9z') + s('M3.5 18.5l4-9h9l4 9zM12 9.5V4M12 4l4 2-4 2M2.5 20.5h19'),
    building: f('M5 3.5h9v17H5z') + s('M5 3.5h9v17H5zM14 9h4.5a1 1 0 0 1 1 1v10.5H14M8 8h3M8 12h3M8 16h3M3.5 20.5h17'),
    key: '<circle class="f" cx="8" cy="12" r="4"/>' + s('M8 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 12h9M18 12v3M21 12v2'),
    cap: f('M12 4L2.5 9 12 14l9.5-5z') + s('M12 4L2.5 9 12 14l9.5-5zM6.5 11.5V16c1.5 1.7 3.4 2.5 5.5 2.5s4-.8 5.5-2.5v-4.5M21.5 9v6'),
    gavel: f('M12.5 4.5l5 5-3 3-5-5z') + s('M12.5 4.5l5 5-3 3-5-5zM10 10l4 4M4 20l7.5-7.5M3 21.5h9'),
    coins: '<ellipse class="f" cx="9" cy="8" rx="5.5" ry="2.8"/>' + s('M3.5 8v4c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8V8M9 5.2c-3 0-5.5 1.3-5.5 2.8M14.5 10.5c3 0 5.5 1.2 5.5 2.7v4c0 1.5-2.500 2.800-5.500 2.800-2.200 0-4.100-.7-5-1.700M3.5 12v4c0 1.500 2.500 2.800 5.500 2.800'),
    percent: s('M18.5 5.5l-13 13') + '<circle class="f" cx="7.5" cy="7.5" r="2.2"/><circle class="f" cx="16.5" cy="16.5" r="2.2"/>',
    lock: '<rect class="f" x="5" y="10.5" width="14" height="10" rx="2.5"/>' + s('M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5'),
    file: f('M6 3.5h8l4.5 4.5v12.5H6z') + s('M6 3.5h8l4.5 4.5v12.5H6zM14 3.5V8h4.5M9 13h6M9 16.5h6'),
    news: f('M4 5h12v14H4z') + s('M4 5h12v14H4zM16 8.5h3.5v8.500a2.500 2.500 0 0 1-2.500 2.500H16M7 9h6M7 12.5h6M7 16h3.500'),
    mega: f('M3.5 10v4l10 4.5V5.500z') + s('M3.5 10v4l10 4.500V5.500zM13.500 8.500c2.500.5 4 1.800 4 3.500s-1.500 3-4 3.500M6 14.500l1 4.500h3'),
    video: f('M3 6.500h12v11H3z') + s('M3 6.500h12v11H3zM15 10.500l6-3.500v10l-6-3.500'),
    camera: f('M3 8h4l1.500-2.500h7L17 8h4v11H3z') + '<circle cx="12" cy="13" r="3.500"/>',
    mic: '<rect class="f" x="9" y="3" width="6" height="11" rx="3"/>' + s('M6 11.500a6 6 0 0 0 12 0M12 17.500V21M9 21h6'),
    bank: f('M4 10l8-5.500 8 5.500z') + s('M4 10l8-5.500 8 5.500zM6 10.500v7M10 10.500v7M14 10.500v7M18 10.500v7M3.500 20h17'),
    star: f('M12 3.500l2.700 5.500 6 .9-4.400 4.200 1 6-5.300-2.800L6.700 20l1-6L3.300 9.900l6-.9z') + s('M12 3.500l2.700 5.500 6 .9-4.400 4.200 1 6-5.300-2.800L6.700 20l1-6L3.300 9.900l6-.9z'),
    truck: f('M2.500 7h11v9h-11z') + s('M2.500 7h11v9h-11zM13.500 10h4l3 3v3h-7M7 18.500a1.700 1.700 0 1 0 0-.01M17 18.500a1.700 1.700 0 1 0 0-.01'),
    tool: f('M14.500 6a4.500 4.500 0 0 0 5.500 5.500L21 13 13 21 3 11l8-8z') + s('M14.500 6a4.500 4.500 0 0 0 5.500 5.500L13 21 3 11l8-8z'),
    warn: f('M12 3.500l9.500 16.500h-19z') + s('M12 3.500l9.500 16.500h-19zM12 10v4.500M12 17.500v.01'),
    fire: f('M12 21c-3.600 0-6-2.400-6-5.600 0-3.200 2.500-4.700 3.500-8.200 1.200 1 2 2.200 2.300 3.600.9-.8 1.500-2 1.700-3.300 2.900 2.200 4.500 5 4.500 7.900 0 3.400-2.400 5.600-6 5.600z') + s('M12 21c-3.600 0-6-2.400-6-5.600 0-3.200 2.500-4.700 3.500-8.200 1.200 1 2 2.200 2.300 3.600.9-.8 1.500-2 1.700-3.300 2.900 2.200 4.500 5 4.500 7.900 0 3.400-2.400 5.600-6 5.600z'),
    pin: f('M12 21s7-6.200 7-11.500a7 7 0 1 0-14 0C5 14.800 12 21 12 21z') + '<circle cx="12" cy="9.500" r="2.500"/>',
    clock: '<circle class="f" cx="12" cy="12" r="8.500"/>' + s('M12 7v5l3.500 2M12 3.500a8.500 8.500 0 1 0 0 17 8.500 8.500 0 0 0 0-17z'),
    task: '<rect class="f" x="5" y="4" width="14" height="17" rx="2.500"/>' + s('M9 4V3h6v1M8.500 11.500l1.500 1.500 3-3M8.500 17h7'),
    candle: '<rect class="f" x="5" y="8" width="4" height="8" rx="1"/><rect class="f" x="15" y="6" width="4" height="10" rx="1"/>' + s('M7 4v4M7 16v4M17 3v3M17 16v5'),
    gold: f('M3.500 17l3-7h11l3 7z') + s('M3.500 17l3-7h11l3 7zM9 10l1-3.500h4L15 10'),
    wrench: s('M14.500 6a4.500 4.500 0 0 0 5.500 5.500L13 18.500a2.100 2.100 0 0 1-3-3l7-7M5 20l3-3')
  };
  const prev = App.icon;
  App.icon = (n, sz = 18) => (I[n] ? `<svg class="ic-d" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>` : prev(n, sz));
  if (App.v700 && App.v700.P) App.v700.ic = (n, sz) => App.icon(n, sz);
  /* nav icons for the sidebar */
  const MAP = { dashboard: 'dashboard', career: 'briefcase', learn: 'cap', business: 'store', operations: 'shield', finance: 'wallet', invest: 'chart', shop: 'store', news: 'news', hub: 'gavel', market: 'trend', creator: 'video', portfolio: 'pie', people: 'users', suppliers: 'supply', events: 'compass', calendar: 'calendar' };
  if (App.navItems) for (const it of App.navItems) if (MAP[it[0]]) it[2] = MAP[it[0]];
  App.v730 = Object.assign(App.v730 || {}, { icons: I });
})();
