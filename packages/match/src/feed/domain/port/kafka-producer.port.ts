export abstract class KafkaProducerPort {

    abstract produce(topic:string,payload:any) : Promise<void>
}