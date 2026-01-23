import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
    private loadingCount = 0;
    private _isLoading = new BehaviorSubject<boolean>(false);
    readonly isLoading$ = this._isLoading.asObservable();

    show(): void {
        this.loadingCount++;
        if (this.loadingCount > 0) {
            this._isLoading.next(true);
        }
    }

    hide(): void {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        if (this.loadingCount === 0) {
            this._isLoading.next(false);
        }
    }

    reset(): void {
        this.loadingCount = 0;
        this._isLoading.next(false);
    }
}
