/* Shows the three tickets' artwork flat, for checking the print before it goes into the studio. ?look=green, ?surface=1 */
import { flat } from './tickets.js';
const q = new URLSearchParams(location.search), look = q.get('look') || 'blue', surface = q.has('surface');
window.done = Promise.all(['ga', 'vip', 'vvip'].map((id, i) => flat(document.getElementById('c' + (i + 1)), id, look, surface))).then(() => 1);
