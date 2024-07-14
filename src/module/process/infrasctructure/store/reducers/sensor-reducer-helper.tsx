

export const loadSensors = (sensors: any) => {
    console.log("loadSensors",sensors);
    return sensors || [];
}

export const loadSensor = (sensors: any, sensorId: string) => {
    return sensors.find((x: any) => x.id === sensorId);
}

export const updateSensor = (prevSensors: any, sensor: any) => {
    console.log("updateSensor",sensor,prevSensors);
    const previous = [...prevSensors];
    if (sensor) {
        const deleteId = sensor?.id.split('_');
        const index = previous.findIndex(x => x.id === (deleteId[1] || sensor?.id))
        if (index > -1) {
            previous[index] = sensor;
        } else {
            previous.push(sensor);
        }
    }
    return previous;
}

export const updateStatus = (prevSensors: any, status: any) => {
    if (status.type === 'SENSOR') {
        const values = [...prevSensors];
        const index = values.findIndex(x => x.id === status.id);
        if (index > -1) {
            values[index] = { ...values[index], value: status.value };
        } else {
            values.push(status);
        }

        return values;
    }

    return [];
}