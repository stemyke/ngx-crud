import {AfterViewInit, Component, ViewChild, ViewEncapsulation} from "@angular/core";
import {RouterOutlet} from "@angular/router";
import {ObservableUtils} from "@stemy/ngx-utils";
import {Subscription} from "rxjs";

import {ICrudOutletState} from "../../common-types";
import {getSnapshotPath} from "../../utils/route.utils";
import {CrudWrapperComponent, defaultOutletState} from "../base/crud-wrapper.component";

@Component({
    standalone: false,
    encapsulation: ViewEncapsulation.None,
    templateUrl: "./crud-child-wrapper.component.html",
    styleUrls: ["./crud-child-wrapper.component.scss"],
    selector: "crud-child-wrapper",
    providers: [
        {provide: CrudWrapperComponent, useExisting: CrudChildWrapperComponent}
    ]
})
export class CrudChildWrapperComponent extends CrudWrapperComponent implements AfterViewInit {

    @ViewChild("before")
    before: RouterOutlet;

    @ViewChild("after")
    after: RouterOutlet;

    protected beforeSub: Subscription;

    protected afterSub: Subscription;

    protected closeTarget: EventTarget;

    ngAfterViewInit() {
        this.subscription = ObservableUtils.multiSubscription(
            this.subscription,
            ObservableUtils.subscribe(
                {
                    subjects: [this.before.activateEvents],
                    cb: () => {
                        const state = this.getState(this.before);
                        this.beforeSub?.unsubscribe();
                        if (state.isActive) {
                            this.beforeSub = ObservableUtils.subscribe({
                                subjects: [this.before.activatedRoute.data, this.before.activatedRoute.params],
                                cb: () => {
                                    const state = this.getState(this.before);
                                    this.beforeState.next(state);
                                    this.cdr.detectChanges();
                                }
                            });
                            return;
                        }
                        this.beforeState.next(state);
                        this.cdr.detectChanges();
                    }
                },
                {
                    subjects: [this.after.activateEvents],
                    cb: () => {
                        const state = this.getState(this.after);
                        this.afterSub?.unsubscribe();
                        if (state.isActive) {
                            this.afterSub = ObservableUtils.subscribe({
                                subjects: [this.after.activatedRoute.data, this.after.activatedRoute.params],
                                cb: () => {
                                    const state = this.getState(this.after);
                                    this.afterState.next(state);
                                    this.cdr.detectChanges();
                                }
                            });
                            return;
                        }
                        this.afterState.next(state);
                        this.cdr.detectChanges();
                    }
                }
            )
        );
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        this.beforeSub?.unsubscribe();
        this.afterSub?.unsubscribe();
    }

    getState(outlet: RouterOutlet): ICrudOutletState {
        if (!outlet?.isActivated) {
            return defaultOutletState;
        }
        const {data, params} = outlet.activatedRoute.snapshot;
        return {
            dialog: this.settings?.mode === 'dialog'
                && outlet.component && !outlet.activatedRouteData.empty,
            isActive: true,
            data: data || {},
            params: params || {},
            snapshot: outlet.activatedRoute.snapshot
        };
    }

    beforeClose(event: MouseEvent): void {
        this.closeTarget = event.target;
    }

    close(outlet: RouterOutlet, event: MouseEvent): boolean {
        if (this.settings?.mode !== 'dialog' || event.target !== this.closeTarget) return true;
        const closeElem = this.findCloseElement(event.target);
        if (!closeElem) return true;
        event.preventDefault();
        const url = getSnapshotPath(outlet.activatedRoute.snapshot, 'list', true);
        this.router.navigateByUrl(url);
        return true;
    }

    protected findCloseElement(target: EventTarget): HTMLElement {
        if (target instanceof HTMLElement) {
            if (target.classList.contains('child-content')) {
                return null;
            }
            if (target.classList.contains('child-wrapper') || target.classList.contains('child-close-btn')) {
                return target;
            }
            return this.findCloseElement(target.parentElement);
        }
        return null;
    }
}
