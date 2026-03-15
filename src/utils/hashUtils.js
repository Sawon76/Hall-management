import SHA256 from 'crypto-js/sha256'

export const hashPassword = (plainText = '') => SHA256(plainText).toString()

export const verifyPassword = (plainText, hashedValue) => hashPassword(plainText) === hashedValue