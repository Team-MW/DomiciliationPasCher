/**
 * Version du texte du contrat de domiciliation.
 *
 * Les contrats « signés » sont souvent REGÉNÉRÉS à la demande à partir de l'image de signature
 * (#local-signature). Un contrat déjà signé doit donc toujours être regénéré avec le texte que le
 * client a réellement signé : jamais sa signature sous un texte plus récent.
 *
 * - Nouvelle signature → `extra_info.contract_version = CONTRACT_VERSION` (posé par le serveur).
 * - Signé sans version → ancien texte (signé avant novembre 2026).
 * - Pas encore signé → texte actuel.
 */
export const CONTRACT_VERSION = '2026-11';

const SIGNED_KEYS = ['contractSigned', 'contractSignedAt', 'contractSignatureUrl', 'contractSignedUrl'];

export function hasSignedContract(extra = {}) {
    return SIGNED_KEYS.some((key) => Boolean(extra?.[key]));
}

/** Contrat signé avant l'entrée en vigueur du texte actuel → regénérer l'ancien texte. */
export function isLegacySignedContract(extra = {}) {
    return hasSignedContract(extra) && extra?.contract_version !== CONTRACT_VERSION;
}
