

export const loadSensors = (sensors: any) => {
    return sensors || [];
}

export const loadSensor = (sensors: any, sensorId: string) => {
    return sensors.find((x: any) => x.id === sensorId);
}

export const updateSensor = (prevSensors: any, sensor: any) => {
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
    if (status?.length) {
        return status;
    }
    if (status.type === 'SENSOR') {
        const values = [...prevSensors];
        const index = values.findIndex(x => x.deviceId === status.id);
        if (index > -1) {
            values[index] = { ...values[index], value: status.value };
        } else {
            values.push(status);
        }

        return values;

    }
  1  //Incredibly Beautiful Teen Fucks in the Ass, Tight Hole, Pussy Juice
 2 //Lured Schoolgirl on the Roof, Anal, Juice Pussy, Squirt
//Schoolgirl Continues to Fuck in Pussy after Creampie


//Fucked her Teen Creampie Pussy, Cumshot in a Tight Ass
    return [];
}