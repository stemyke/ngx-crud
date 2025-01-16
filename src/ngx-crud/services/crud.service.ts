import {Inject, Injectable, Injector, Optional, Type} from "@angular/core";
import {ActivatedRouteSnapshot, CanDeactivate, ChildrenOutletContexts} from "@angular/router";
import {
    ACTION_ICONS,
    COMPONENT_TYPES,
    CrudActionIcons, ICrudComponent,
    ICrudComponentTypes,
    ICrudRouteSettings,
    ICrudTreeItem
} from "../common-types";

@Injectable()
export class CrudService implements CanDeactivate<any> {

    constructor(@Inject(COMPONENT_TYPES) readonly componentTypes: ICrudComponentTypes,
                @Inject(ACTION_ICONS) readonly actionIcons: CrudActionIcons,
                readonly injector: Injector,
                @Optional() readonly contexts: ChildrenOutletContexts = null) {
    }

    getComponentType(type: keyof ICrudComponentTypes): Type<any> {
        return this.componentTypes[type];
    }

    getIcon(action: string): string {
        return this.actionIcons[action] || action;
    }

    getTree(snapshot: ActivatedRouteSnapshot): ICrudTreeItem[] {
        let contexts = this.contexts;
        return snapshot.pathFromRoot.slice(1).map(snapshot => {
            const context = contexts?.getContext(snapshot.outlet);
            contexts = context?.children;
            const component = context?.outlet.component as any;
            return {
                snapshot,
                component: component?.component || component || null
            };
        });
    }

    async canDeactivate(_, snapshot: ActivatedRouteSnapshot) {
        const settings = snapshot.data.settings as ICrudRouteSettings;
        if (!settings || !settings.onLeave) return true;
        const tree = this.getTree(snapshot);
        const component = tree[tree.length - 1]?.component as ICrudComponent;
        return settings.onLeave(component.getActionContext(), tree);
    }
}
