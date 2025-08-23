
export abstract class EventPublisherPort {

    abstract publish(topic:string,payload:any) : Promise<void>
}