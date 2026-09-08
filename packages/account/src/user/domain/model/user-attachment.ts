import { PersistenceEntity } from "@core/model";

export interface IUserAttachment {
    path: string;
    active: boolean;
}

export class UserAttachmentEntity extends PersistenceEntity<{ userId: string, no: number }, IUserAttachment> {
    private constructor(param: IUserAttachment, id?: { userId: string, no: number }) {
        super(param, id);
    }

    static of(param: IUserAttachment, id?: { userId: string, no: number }) {
        return new UserAttachmentEntity(param, id);
    }

    get path(): string {
        return this.etc.path;
    }

    get active(): boolean {
        return this.etc.active;
    }

    activate() {
        this.etc.active = true;
        return this;
    }

    deactivate() {
        this.etc.active = false;
        return this;
    }

    updatePath(path: string) {
        this.etc.path = path;
        return this;
    }
}   