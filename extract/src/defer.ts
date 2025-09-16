export class Defer {
    pending = 0;
    promise: Promise<void> = Promise.resolve();
    resolve?: () => void;

    enqueue() {
        if (this.pending++ === 0) {
            this.promise = new Promise<void>((res) => {
                this.resolve = res;
            });
        }
    }
    dequeue() {
        if (this.pending > 0 && --this.pending === 0) {
            this.resolve?.();
        }
    }
}
