// Shared shapes for a sequence's module references. A sequence keeps a list of
// `SequenceModuleRef` (persisted as `moduleConfigs`): a `moduleId` pointing at a
// master actuator plus the timings and optional custom value proper to this use.
export interface ModuleTimingConfig {
	waitBeforeExec: number;
	waitAfterExec: number;
	waitBeforeExecOff: number;
	waitAfterExecOff: number;
}

export interface SequenceModuleRef {
	moduleId: string;
	configTiming: ModuleTimingConfig;
	customValue?: number;
	delete?: boolean;
}

export const emptyTimingConfig = (): ModuleTimingConfig => ({
	waitBeforeExec: 0,
	waitAfterExec: 0,
	waitBeforeExecOff: 0,
	waitAfterExecOff: 0
});

// Strips the display/tracking metadata (name, type, isModified) a module ref
// carries while editing, keeping only the persisted `SequenceModuleRef` shape.
export const toSequenceModuleRef = (moduleConfig: any): SequenceModuleRef => {
	const ref: SequenceModuleRef = {
		moduleId: moduleConfig?.moduleId,
		configTiming: {...emptyTimingConfig(), ...moduleConfig?.configTiming}
	};
	if (moduleConfig?.customValue !== undefined && moduleConfig?.customValue !== null) {
		ref.customValue = moduleConfig.customValue;
	}
	if (moduleConfig?.delete) {
		ref.delete = true;
	}
	return ref;
};

// Cleans every sequence's `moduleConfigs` of a cycle down to strict
// `SequenceModuleRef[]` right before the cycle is sent to the backend.
export const cleanCycleModuleConfigs = (cycle: any) => {
	if (!cycle?.sequences) {
		return cycle;
	}
	return {
		...cycle,
		sequences: cycle.sequences.map((sequence: any) =>
			sequence?.moduleConfigs
				? {
						...sequence,
						moduleConfigs:
							sequence.moduleConfigs.map(toSequenceModuleRef)
				  }
				: sequence
		)
	};
};
