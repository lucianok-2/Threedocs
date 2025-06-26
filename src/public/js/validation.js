function isValidChileanRUT(rut) {
  if (!rut || typeof rut !== 'string') {
    return false;
  }

  rut = rut.replace(/[^0-9kK]/g, '').toUpperCase();

  if (rut.length < 2) {
    return false;
  }

  const body = rut.slice(0, -1);
  const dv = rut.slice(-1);

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier++;
    if (multiplier > 7) {
      multiplier = 2;
    }
  }

  const remainder = sum % 11;
  let calculatedDv = 11 - remainder;

  if (calculatedDv === 11) {
    calculatedDv = '0';
  } else if (calculatedDv === 10) {
    calculatedDv = 'K';
  } else {
    calculatedDv = String(calculatedDv);
  }

  return calculatedDv === dv;
}