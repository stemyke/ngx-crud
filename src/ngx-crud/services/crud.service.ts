import {Inject, Injectable, Type} from "@angular/core";
import {COMPONENT_TYPES, ICrudComponentTypes} from "../common-types";

@Injectable()
export class CrudService {

    constructor(@Inject(COMPONENT_TYPES) readonly componentTypes: ICrudComponentTypes) {
    }

    getComponentType(type: keyof ICrudComponentTypes): Type<any> {
        return this.componentTypes[type];
    }
}
