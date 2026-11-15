package ph.gov.caloocan.pulso;

import android.app.job.JobParameters;
import android.app.job.JobService;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.FutureTask;

public class PulsoUpdateJobService extends JobService {
    private final ConcurrentHashMap<Integer, FutureTask<Void>> tasks = new ConcurrentHashMap<>();
    @Override public boolean onStartJob(JobParameters parameters) {
        int id = parameters.getJobId();
        FutureTask<Void> task = new FutureTask<Void>(() -> {
            boolean retry = false;
            try { PulsoUpdateMonitor.check(getApplicationContext(), android.os.Build.VERSION.SDK_INT >= 28 ? parameters.getNetwork() : null); }
            catch (Exception unavailable) { retry = true; }
            if (!Thread.currentThread().isInterrupted()) jobFinished(parameters, retry);
            return null;
        }) {
            @Override protected void done() { tasks.remove(id, this); }
        };
        tasks.put(id, task);
        PulsoUpdateMonitor.EXECUTOR.execute(task);
        return true;
    }
    @Override public boolean onStopJob(JobParameters parameters) {
        FutureTask<Void> task = tasks.remove(parameters.getJobId());
        if (task != null) task.cancel(true);
        return true;
    }
}
