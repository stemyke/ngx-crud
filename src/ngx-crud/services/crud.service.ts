import {Inject, Injectable, Type} from "@angular/core";
import {ACTION_ICONS, COMPONENT_TYPES, CrudActionIcons, ICrudComponentTypes} from "../common-types";

@Injectable()
export class CrudService {

    constructor(@Inject(COMPONENT_TYPES) readonly componentTypes: ICrudComponentTypes,
                @Inject(ACTION_ICONS) readonly actionIcons: CrudActionIcons) {
    }

    getComponentType(type: keyof ICrudComponentTypes): Type<any> {
        return this.componentTypes[type];
    }

    getIcon(action: string): string {
        return this.actionIcons[action] || action;
    }
}
