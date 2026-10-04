import { BadRequestException, type ValidationError } from '@nestjs/common';

// Common rules answer in French; the order is the priority when several fail
const FRENCH: Record<string, string> = {
  isDefined: 'Champ requis',
  isNotEmpty: 'Champ requis',
  isString: 'Texte attendu',
  isBoolean: 'Oui ou non attendu',
  isInt: 'Nombre entier attendu',
  isNumber: 'Nombre attendu',
  isEmail: 'Email invalide',
  isIce: "L'ICE compte 15 chiffres",
  isUuid: 'Identifiant invalide',
  isDateString: 'Date invalide',
  isIn: 'Valeur non autorisée',
  isEnum: 'Valeur non autorisée',
  isArray: 'Liste attendue',
  arrayMinSize: 'Au moins un élément',
  arrayMaxSize: "Trop d'éléments",
  arrayUnique: 'Valeurs en double',
  min: 'Valeur trop petite',
  max: 'Valeur trop grande',
  minLength: 'Texte trop court',
  maxLength: 'Texte trop long',
};

// { fields: { "lines.0.quantity": "…" } }: one message per invalid field
export function validationException(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException({
    code: 'VALIDATION_FAILED',
    message: 'Données invalides',
    fields: collectFields(errors),
  });
}

export function collectFields(
  errors: ValidationError[],
  parent = '',
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const message = messageFor(error);
    if (message) {
      fields[path] = message;
    }
    Object.assign(fields, collectFields(error.children ?? [], path));
  }
  return fields;
}

function messageFor(error: ValidationError): string | undefined {
  const constraints = error.constraints ?? {};
  const failed = Object.keys(constraints);
  if (failed.length === 0) {
    return undefined;
  }
  if (constraints.whitelistValidation) {
    return 'Champ non autorisé';
  }
  if (error.value === undefined || error.value === null || error.value === '') {
    return 'Champ requis';
  }
  const known = Object.keys(FRENCH).find((name) => failed.includes(name));
  if (known) {
    return FRENCH[known];
  }
  // A format rule carries its own message in the DTO
  return constraints.matches ?? 'Valeur invalide';
}
