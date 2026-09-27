import { assertCentimes } from './money.js';

const UNITS = [
  'zéro',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

// 7788000 → "soixante-dix-sept mille huit cent quatre-vingts dirhams"
export function amountInWords(centimes: number): string {
  assertCentimes(centimes);
  if (centimes < 0) {
    throw new RangeError(`Words take a positive amount: ${centimes}`);
  }
  const dirhams = Math.floor(centimes / 100);
  const rest = centimes % 100;
  const centimesWords =
    rest === 0
      ? ''
      : `${belowHundred(rest, true)} ${rest === 1 ? 'centime' : 'centimes'}`;
  if (dirhams === 0 && rest > 0) {
    return centimesWords;
  }
  // "un million de dirhams", but "un million cent mille dirhams"
  const de = dirhams >= 1_000_000 && dirhams % 1_000_000 === 0 ? 'de ' : '';
  const dirhamsWords = `${wholeNumber(dirhams)} ${de}${dirhams < 2 ? 'dirham' : 'dirhams'}`;
  return rest === 0 ? dirhamsWords : `${dirhamsWords} et ${centimesWords}`;
}

function wholeNumber(n: number): string {
  if (n === 0) {
    return 'zéro';
  }
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor(n / 1000) % 1000;
  const units = n % 1000;
  const parts: string[] = [];
  if (millions > 0) {
    parts.push(
      millions === 1
        ? 'un million'
        : `${belowThousand(millions, true)} millions`,
    );
  }
  if (thousands > 0) {
    // "mille", never "un mille"; "deux cent mille" without an s
    parts.push(
      thousands === 1 ? 'mille' : `${belowThousand(thousands, false)} mille`,
    );
  }
  if (units > 0) {
    parts.push(belowThousand(units, true));
  }
  return parts.join(' ');
}

// isLast: the number ends here, so cent and quatre-vingt take an s
function belowThousand(n: number, isLast: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const restWords = rest === 0 ? '' : belowHundred(rest, isLast);
  if (hundreds === 0) {
    return restWords;
  }
  const cent =
    hundreds === 1
      ? 'cent'
      : `${UNITS[hundreds]} ${rest === 0 && isLast ? 'cents' : 'cent'}`;
  return rest === 0 ? cent : `${cent} ${restWords}`;
}

function belowHundred(n: number, isLast: boolean): string {
  if (n < 17) {
    return UNITS[n];
  }
  if (n < 20) {
    return `dix-${UNITS[n - 10]}`;
  }
  if (n < 70) {
    const tens = TENS[Math.floor(n / 10)];
    const unit = n % 10;
    if (unit === 0) {
      return tens;
    }
    return unit === 1 ? `${tens} et un` : `${tens}-${UNITS[unit]}`;
  }
  if (n < 80) {
    return n === 71
      ? 'soixante et onze'
      : `soixante-${belowHundred(n - 60, isLast)}`;
  }
  if (n === 80) {
    return isLast ? 'quatre-vingts' : 'quatre-vingt';
  }
  return `quatre-vingt-${belowHundred(n - 80, isLast)}`;
}
