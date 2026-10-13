import {BoxConfigurationForm} from '../../../services/validation';

/**
 * Dernière saisie du formulaire de configuration de la box.
 *
 * Sert à la retrouver intacte après un échec de bascule : l'écran de
 * configuration est sorti de la pile au moment d'envoyer — il n'a plus de
 * réseau pour travailler — et son état est donc perdu avec lui. Le brouillon
 * survit à cette remise à zéro, quel que soit le chemin par lequel on revient
 * au formulaire : retour direct depuis l'écran de bascule, ou nouvel appairage
 * complet par le scanner.
 *
 * Volontairement en mémoire seulement, jamais sur disque : il contient la clé
 * Wi-Fi du réseau et le mot de passe du compte. Les persister les exposerait
 * bien au-delà du besoin, qui ne dure que le temps d'un appairage.
 */
let draft: BoxConfigurationForm | null = null;

export function saveBoxConfigurationDraft(form: BoxConfigurationForm): void {
	draft = {...form};
}

export function readBoxConfigurationDraft(): BoxConfigurationForm | null {
	return draft ? {...draft} : null;
}

/** À appeler dès que la configuration est confirmée : elle n'a plus à traîner. */
export function clearBoxConfigurationDraft(): void {
	draft = null;
}
