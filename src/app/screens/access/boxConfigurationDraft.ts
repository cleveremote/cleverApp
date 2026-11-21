import {ConfigureSend} from '../../../services/http';
import {BoxConfigurationForm} from '../../../services/validation';

/**
 * Dernière saisie du formulaire de configuration de la box.
 *
 * Sert à la retrouver intacte après un échec de bascule : une fois la
 * configuration envoyée, le formulaire cède la place à la progression — il n'a
 * plus de réseau pour travailler — et y revenir remplace la pile, donc perd son
 * état. Le brouillon survit à cette remise à zéro, quel que soit le chemin par
 * lequel on revient au formulaire : retour direct depuis la progression, ou
 * nouvel appairage complet par le scanner.
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
 * Envoi de `configure`, lancé au moment d'ouvrir l'écran d'état sans être
 * attendu. `BoxHandover` en lit l'issue : un refus s'y affiche. L'issue reste
 * lisible après coup, pour qu'une nouvelle vérification retrouve la même.
 */
let pendingConfiguration: Promise<ConfigureSend> | null = null;

export function setPendingConfiguration(request: Promise<ConfigureSend>): void {
	pendingConfiguration = request.catch((): ConfigureSend => ({kind: 'lost'}));
}

/** Rien à attendre : la box n'a reçu que son réseau (`recovery`). */
export function clearPendingConfiguration(): void {
	pendingConfiguration = null;
}

/**
 * Issue de l'envoi, attendue s'il est encore en vol. `null` si rien n'a été
 * envoyé. Ne rejette jamais.
 */
export async function settlePendingConfiguration(): Promise<ConfigureSend | null> {
	return pendingConfiguration;
}

/**
 * Profil à créer pour la box qui vient d'être configurée.
 *
 * Il n'est enregistré qu'une fois la box confirmée sur le réseau demandé : une
 * bascule qui échoue ne doit pas laisser derrière elle un profil pointant vers
 * une box injoignable. En mémoire seulement, pour la même raison que le
 * brouillon : il porte le mot de passe du compte.
 */
export type PendingProfile = {
	deviceName: string;
	login: string;
	password: string;
};

let pendingProfile: PendingProfile | null = null;

export function setPendingProfile(profile: PendingProfile | null): void {
	pendingProfile = profile ? {...profile} : null;
}

/** Rend le profil en attente et l'oublie : il ne sert qu'une fois. */
export function takePendingProfile(): PendingProfile | null {
	const profile = pendingProfile;
	pendingProfile = null;
	return profile;
}
