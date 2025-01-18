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

    close(event: MouseEvent, outlet: RouterOutlet): void {
        if (this.settings?.mode !== 'dialog') return;
        const classList = event.target instanceof HTMLElement
            ? Array.from(event.target.classList) : [];
        if (!classList.includes('child-wrapper') && !classList.includes('child-close-btn')) return;
        event.preventDefault();
        const url = getSnapshotPath(outlet.activatedRoute.snapshot, 'list', true);
        this.router.navigateByUrl(url);
    }
}
