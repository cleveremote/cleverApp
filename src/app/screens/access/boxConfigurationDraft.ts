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

/**
 * Envoi de `configure` encore en vol quand l'écran d'état s'ouvre : il part
 * en même temps que la navigation, et `BoxHandover` doit l'attendre avant de
 * relâcher le hotspot — sur Android, le relâcher coupe une requête qui n'a pas
 * fini de partir.
 */
let pendingConfiguration: Promise<unknown> | null = null;

export function setPendingConfiguration(request: Promise<unknown>): void {
	const settled = request.then(
		() => undefined,
		() => undefined
	);
	pendingConfiguration = settled;
	settled.then(() => {
		if (pendingConfiguration === settled) pendingConfiguration = null;
	});
}

/** Attend la fin de l'envoi en cours, s'il y en a un. Ne rejette jamais. */
export async function settlePendingConfiguration(): Promise<void> {
	await pendingConfiguration;
}
