package server;

import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import sun.misc.RequestProcessor;

import java.io.File;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Created by cybaek on 15. 5. 22..
 */
public class HttpServer {
    public static final String CONFIG_PATH = "config/server.config.json";
    public static final String DOCUMENT_ROOT = "webapp";
    public static final String DEFAULT_SERVER= "localhost";

    private static final Logger logger = Logger.getLogger(HttpServer.class.getCanonicalName());
    private static final int NUM_THREADS = 50;
    private static final String INDEX_FILE = "index.html";
    private final File rootDirectory ;
    private final int port;
    private final File configFile;

    public void loadConfig(File file){
        this.configFile = file;
    new File(getClass().getClassLoader().getResource("/resources/config.json").getFile());
    }
    public HttpServer() throws Exception{
        JSONParser jsonParser = new JSONParser();
        JSONObject jsonObject = (JSONObject) jsonParser.parse(this.configFile.toString());

        // get the Document root
        this.rootDirectory = new File(jsonObject.get("rootDir").toString());
        if (!rootDirectory.isDirectory()) {
            throw new IOException(rootDirectory + " does not exist as a directory");
        }

        // set the port to listen on
        port = Integer.parseInt(jsonObject.get("port").toString());
        if (port < 0 || port > 65535){
            System.out.println("Usage: java JHTTP docroot port");
            throw new IOException(port  + " does not exist as a directory");
        }
    }

    public void start() throws IOException {
        ExecutorService pool = Executors.newFixedThreadPool(NUM_THREADS);
        try (ServerSocket server = new ServerSocket(port)) {
            logger.info("Accepting connections on port " + server.getLocalPort());
            logger.info("Document Root: " + rootDirectory);
            while (true) {
                try {
                    Socket request = server.accept();
                    Runnable r = new RequestProcessor(rootDirectory, INDEX_FILE, request);
                    pool.submit(r);
                } catch (IOException ex) {
                    logger.log(Level.WARNING, "Error accepting connection", ex);
                }
            }
        }
    }

    public static void main(String[] args) throws Exception{
        try {
            HttpServer webServer = new HttpServer();
            webServer.start();
        } catch (Exception ex) {
            logger.log(Level.SEVERE, "Server could not start", ex);
        }
    }


    // get file from classpath, resources folder
    private File getFileFromResources(String fileName) {
        ClassLoader classLoader = getClass().getClassLoader();
        URL resource = classLoader.getResource(fileName);
        if (resource == null) {
            throw new IllegalArgumentException("file is not found!");
        } else {
            return new File(resource.getFile());
        }

    }
}