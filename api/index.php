<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
$baseDir = realpath(__DIR__ . "/..");
$sqliteDir = $baseDir . "/data";
$sqlitePath = $sqliteDir . "/content.sqlite";
$p5ProjectsDir = $baseDir . "/p5js-projects";
$p5ProjectsPublicPrefix = "/p5js-projects";
$typeToFolder = [
    "fractals" => $baseDir . "/img/fractals",
    "digital" => $baseDir . "/img/digital",
    "fotos" => $baseDir . "/img/fotos",
    "raspi" => $baseDir . "/img/lab/raspi",
    "esp32" => $baseDir . "/img/lab/esp32",
    "code" => $baseDir . "/img/lab/code",
    "howto" => $baseDir . "/img/tools/howto",
];
$typeAliases = [
    "fractals" => "fractals",
    "fraktale" => "fractals",
    "image" => "fractals",
    "digital" => "digital",
    "digitalart" => "digital",
    "pwn" => "digital",
    "fotos" => "fotos",
    "crow" => "fotos",
    "editor" => "code",
    "raspi" => "raspi",
    "esp32" => "esp32",
    "code" => "code",
    "howto" => "howto",
];
$editablePages = [
    "raspi" => $baseDir . "/raspi.html",
    "esp32" => $baseDir . "/esp32.html",
    "code" => $baseDir . "/code.html",
    "howto" => $baseDir . "/howto.html",
];
const THUMB_MAX_EDGE = 640;
const P5_MAX_TOTAL_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB
const P5_MAX_SNIPPETS = 12;
const P5_MAX_SNIPPET_BYTES = 20000;
const P5_MAX_DESCRIPTION_BYTES = 20000;

function sanitizePathSegment(string $segment): string
{
    $clean = trim(str_replace("\\", "/", $segment));
    if ($clean === "" || $clean === "." || $clean === "..") {
        return "";
    }
    $clean = preg_replace("/[^\p{L}\p{N}\-\._ ]+/u", "", $clean) ?? "";
    $clean = preg_replace("/\s+/", " ", $clean) ?? "";
    $clean = trim($clean, ". \t\n\r\0\x0B");
    return $clean;
}

function normalizeRelativeUploadPath(string $relativePath): string
{
    $raw = trim(str_replace("\\", "/", $relativePath));
    if ($raw === "") {
        return "";
    }

    $segments = array_values(array_filter(explode("/", $raw), static function ($entry) {
        return trim((string)$entry) !== "";
    }));
    if (!$segments) {
        return "";
    }

    $normalized = [];
    foreach ($segments as $segment) {
        $clean = sanitizePathSegment((string)$segment);
        if ($clean === "") {
            return "";
        }
        $normalized[] = $clean;
    }

    return implode("/", $normalized);
}

function removeDirectoryRecursive(string $path): bool
{
    if (!is_dir($path)) {
        return true;
    }

    $items = scandir($path);
    if ($items === false) {
        return false;
    }

    foreach ($items as $item) {
        if ($item === "." || $item === "..") {
            continue;
        }
        $target = $path . "/" . $item;
        if (is_dir($target)) {
            if (!removeDirectoryRecursive($target)) {
                return false;
            }
            continue;
        }
        if (!@unlink($target)) {
            return false;
        }
    }

    return @rmdir($path);
}

function resolveP5EntryPublicPath(string $projectDir, string $projectSlug, string $publicPrefix): string
{
    $directIndex = $projectDir . "/index.html";
    if (is_file($directIndex)) {
        return rtrim($publicPrefix, "/") . "/" . rawurlencode($projectSlug) . "/index.html";
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($projectDir, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $fileInfo) {
        if (!$fileInfo->isFile()) {
            continue;
        }
        if (strtolower($fileInfo->getExtension()) !== "html") {
            continue;
        }
        $absolutePath = str_replace("\\", "/", $fileInfo->getPathname());
        $basePath = rtrim(str_replace("\\", "/", $projectDir), "/") . "/";
        if (strpos($absolutePath, $basePath) !== 0) {
            continue;
        }
        $relativePath = substr($absolutePath, strlen($basePath));
        $encodedPath = implode("/", array_map("rawurlencode", explode("/", $relativePath)));
        return rtrim($publicPrefix, "/") . "/" . rawurlencode($projectSlug) . "/" . $encodedPath;
    }

    return "";
}

function resolveP5EntryRelativePath(string $projectDir): string
{
    $directIndex = $projectDir . "/index.html";
    if (is_file($directIndex)) {
        return "index.html";
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($projectDir, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $fileInfo) {
        if (!$fileInfo->isFile()) {
            continue;
        }
        if (strtolower($fileInfo->getExtension()) !== "html") {
            continue;
        }
        $absolutePath = str_replace("\\", "/", $fileInfo->getPathname());
        $basePath = rtrim(str_replace("\\", "/", $projectDir), "/") . "/";
        if (strpos($absolutePath, $basePath) !== 0) {
            continue;
        }
        return (string)substr($absolutePath, strlen($basePath));
    }

    return "";
}

function extractLocalScriptPathsFromHtml(string $html): array
{
    if (trim($html) === "") {
        return [];
    }

    $matches = [];
    preg_match_all('/<script[^>]+src=["\']([^"\']+)["\']/i', $html, $matches);
    $rawPaths = is_array($matches[1] ?? null) ? $matches[1] : [];
    $result = [];
    foreach ($rawPaths as $rawPath) {
        $src = trim((string)$rawPath);
        if ($src === "") {
            continue;
        }
        if (preg_match('/^(https?:)?\/\//i', $src)) {
            continue;
        }
        if (strpos($src, "data:") === 0) {
            continue;
        }
        $clean = preg_replace('/[#?].*$/', "", $src) ?? "";
        if ($clean === "") {
            continue;
        }
        $result[] = $clean;
    }
    return array_values(array_unique($result));
}

function resolveSafeProjectFilePath(string $projectDir, string $baseRelativePath, string $targetPath): string
{
    $baseDir = dirname($baseRelativePath);
    $combined = $baseDir === "." ? $targetPath : ($baseDir . "/" . $targetPath);
    $segments = explode("/", str_replace("\\", "/", $combined));
    $stack = [];
    foreach ($segments as $segment) {
        $segment = trim((string)$segment);
        if ($segment === "" || $segment === ".") {
            continue;
        }
        if ($segment === "..") {
            if (count($stack) > 0) {
                array_pop($stack);
            }
            continue;
        }
        $stack[] = $segment;
    }
    $relative = implode("/", $stack);
    if ($relative === "") {
        return "";
    }
    return $projectDir . "/" . $relative;
}

function findRelevantSketchRelativePath(string $projectDir, string $entryRelativePath, string $entryContent): string
{
    $scriptPaths = extractLocalScriptPathsFromHtml($entryContent);
    foreach ($scriptPaths as $scriptPath) {
        $resolved = resolveSafeProjectFilePath($projectDir, $entryRelativePath, $scriptPath);
        if ($resolved === "" || !is_file($resolved)) {
            continue;
        }
        if (strtolower((string)basename($resolved)) !== "sketch.js") {
            continue;
        }
        $normalizedResolved = str_replace("\\", "/", $resolved);
        $normalizedProject = rtrim(str_replace("\\", "/", $projectDir), "/") . "/";
        return strpos($normalizedResolved, $normalizedProject) === 0
            ? (string)substr($normalizedResolved, strlen($normalizedProject))
            : (string)basename($resolved);
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($projectDir, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $fileInfo) {
        if (!$fileInfo->isFile()) {
            continue;
        }
        if (strtolower((string)$fileInfo->getFilename()) !== "sketch.js") {
            continue;
        }
        $absolutePath = str_replace("\\", "/", $fileInfo->getPathname());
        $basePath = rtrim(str_replace("\\", "/", $projectDir), "/") . "/";
        if (strpos($absolutePath, $basePath) !== 0) {
            continue;
        }
        return (string)substr($absolutePath, strlen($basePath));
    }

    return "";
}

function listP5Projects(string $projectsDir, string $publicPrefix): array
{
    if (!is_dir($projectsDir)) {
        return [];
    }

    $entries = scandir($projectsDir);
    if ($entries === false) {
        return [];
    }

    $projects = [];
    foreach ($entries as $entry) {
        if ($entry === "." || $entry === "..") {
            continue;
        }
        $projectPath = $projectsDir . "/" . $entry;
        if (!is_dir($projectPath)) {
            continue;
        }
        $entryUrl = resolveP5EntryPublicPath($projectPath, $entry, $publicPrefix);
        if ($entryUrl === "") {
            continue;
        }
        $metadata = readP5ProjectMetadata($projectPath);
        $projects[] = [
            "slug" => $entry,
            "name" => ucwords((string)preg_replace("/[-_]+/", " ", $entry)),
            "entry_url" => $entryUrl,
            "description" => (string)($metadata["description"] ?? ""),
            "snippet_count" => count((array)($metadata["snippets"] ?? [])),
            "updated_at" => date(DATE_ATOM, @filemtime($projectPath) ?: time()),
        ];
    }

    usort($projects, static function ($a, $b) {
        return strcmp((string)$b["updated_at"], (string)$a["updated_at"]);
    });

    return $projects;
}

function getP5ProjectMetadataPath(string $projectDir): string
{
    return rtrim($projectDir, "/") . "/project.json";
}

function sanitizeP5Description(string $raw): string
{
    $description = trim((string)$raw);
    if ($description === "") {
        return "";
    }
    if (strlen($description) > P5_MAX_DESCRIPTION_BYTES) {
        $description = substr($description, 0, P5_MAX_DESCRIPTION_BYTES);
    }
    return trim($description);
}

function parseP5Snippets(string $raw): array
{
    $decoded = json_decode((string)$raw, true);
    return sanitizeP5SnippetArray($decoded);
}

function sanitizeP5SnippetArray($decoded): array
{
    if (!is_array($decoded)) {
        return [];
    }
    $snippets = [];
    foreach ($decoded as $entry) {
        if (!is_string($entry)) {
            continue;
        }
        $snippet = trim($entry);
        if ($snippet === "") {
            continue;
        }
        if (strlen($snippet) > P5_MAX_SNIPPET_BYTES) {
            $snippet = substr($snippet, 0, P5_MAX_SNIPPET_BYTES);
        }
        $snippets[] = $snippet;
        if (count($snippets) >= P5_MAX_SNIPPETS) {
            break;
        }
    }

    return $snippets;
}

function readP5ProjectMetadata(string $projectDir): array
{
    $path = getP5ProjectMetadataPath($projectDir);
    if (!is_file($path)) {
        return [
            "description" => "",
            "snippets" => [],
        ];
    }

    $raw = @file_get_contents($path);
    if ($raw === false || trim($raw) === "") {
        return [
            "description" => "",
            "snippets" => [],
        ];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return [
            "description" => "",
            "snippets" => [],
        ];
    }

    return [
        "description" => sanitizeP5Description((string)($decoded["description"] ?? "")),
        "snippets" => sanitizeP5SnippetArray($decoded["snippets"] ?? []),
    ];
}

function writeP5ProjectMetadata(string $projectDir, string $description, array $snippets): bool
{
    $path = getP5ProjectMetadataPath($projectDir);
    $payload = [
        "description" => sanitizeP5Description($description),
        "snippets" => array_values($snippets),
        "updated_at" => date(DATE_ATOM),
    ];
    $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($encoded === false) {
        return false;
    }
    return @file_put_contents($path, $encoded) !== false;
}

function extractEditableContentFromHtml(string $rawHtml): string
{
    if (!preg_match("/<!--\\s*EDITABLE:START\\s*-->(.*?)<!--\\s*EDITABLE:END\\s*-->/s", $rawHtml, $matches)) {
        return "";
    }

    return trim((string)($matches[1] ?? ""));
}

function extractFirstProjectCard(string $html): string
{
    if (trim($html) === "") {
        return "";
    }

    if (preg_match('/<article\\b[^>]*class=["\'][^"\']*project-section-card[^"\']*["\'][^>]*>.*?<\\/article>/is', $html, $matches)) {
        return trim((string)($matches[0] ?? ""));
    }

    return "";
}

function fetchRemoteRaspiSeedContent(): string
{
    $context = stream_context_create([
        "http" => [
            "method" => "GET",
            "timeout" => 8,
            "header" => "User-Agent: mnemonic.guru Content Seeder\r\n",
        ],
    ]);

    $rawHtml = @file_get_contents("https://mnemonic.guru/raspi.html", false, $context);
    if ($rawHtml === false || trim($rawHtml) === "") {
        return "";
    }

    $editableContent = extractEditableContentFromHtml($rawHtml);
    $firstCard = extractFirstProjectCard($editableContent !== "" ? $editableContent : $rawHtml);
    if ($firstCard !== "") {
        return $firstCard;
    }

    return trim($editableContent);
}

function getPageFallbackContent(string $pagePath): string
{
    $rawHtml = @file_get_contents($pagePath);
    if ($rawHtml === false) {
        return "<p></p>";
    }

    $content = extractEditableContentFromHtml($rawHtml);
    return $content !== "" ? $content : "<p></p>";
}

function getSqliteConnection(string $sqliteDir, string $sqlitePath): PDO
{
    if (!is_dir($sqliteDir) && !@mkdir($sqliteDir, 0755, true) && !is_dir($sqliteDir)) {
        throw new RuntimeException("sqlite-verzeichnis konnte nicht erstellt werden");
    }

    $pdo = new PDO("sqlite:" . $sqlitePath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS pages (
            page_key TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )"
    );

    return $pdo;
}

function ensurePageSeed(PDO $pdo, string $pageKey, string $fallbackContent): void
{
    $checkStatement = $pdo->prepare("SELECT page_key FROM pages WHERE page_key = :page_key LIMIT 1");
    $checkStatement->execute([":page_key" => $pageKey]);
    if ($checkStatement->fetch()) {
        return;
    }

    $seedContent = trim($fallbackContent);
    if ($pageKey === "raspi") {
        $remoteSeed = fetchRemoteRaspiSeedContent();
        if ($remoteSeed !== "") {
            $seedContent = $remoteSeed;
        }
    }
    if ($seedContent === "") {
        $seedContent = "<p></p>";
    }

    $insertStatement = $pdo->prepare(
        "INSERT INTO pages (page_key, content, updated_at) VALUES (:page_key, :content, CURRENT_TIMESTAMP)"
    );
    $insertStatement->execute([
        ":page_key" => $pageKey,
        ":content" => $seedContent,
    ]);
}

function readPageContentFromStore(PDO $pdo, string $pageKey): array
{
    $selectStatement = $pdo->prepare("SELECT content, updated_at FROM pages WHERE page_key = :page_key LIMIT 1");
    $selectStatement->execute([":page_key" => $pageKey]);
    $row = $selectStatement->fetch();

    return [
        "content" => trim((string)($row["content"] ?? "")),
        "updated_at" => trim((string)($row["updated_at"] ?? "")),
    ];
}

function savePageContentToStore(PDO $pdo, string $pageKey, string $content): void
{
    $statement = $pdo->prepare(
        "INSERT INTO pages (page_key, content, updated_at)
         VALUES (:page_key, :content, CURRENT_TIMESTAMP)
         ON CONFLICT(page_key) DO UPDATE SET
             content = excluded.content,
             updated_at = CURRENT_TIMESTAMP"
    );
    $statement->execute([
        ":page_key" => $pageKey,
        ":content" => $content,
    ]);
}

function sanitizeUploadBaseName(string $originalName): string
{
    $base = pathinfo($originalName, PATHINFO_FILENAME);
    $base = trim($base);
    if ($base === "") {
        return "upload";
    }

    $base = preg_replace("/[^\p{L}\p{N}\-\._ ]+/u", "", $base) ?? "";
    $base = preg_replace("/\s+/", " ", $base) ?? "";
    $base = trim($base, ". \t\n\r\0\x0B");

    if ($base === "") {
        return "upload";
    }

    if (strlen($base) > 180) {
        $base = substr($base, 0, 180);
        $base = rtrim($base, ". ");
    }

    return $base !== "" ? $base : "upload";
}

function extractFirstImageUrl(string $html): string
{
    if (trim($html) === "") {
        return "";
    }

    if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $html, $matches)) {
        return trim((string)($matches[1] ?? ""));
    }

    return "";
}

function absolutizeUrl(string $url, string $baseUrl): string
{
    $url = trim($url);
    if ($url === "") {
        return "";
    }

    if (preg_match('/^https?:\/\//i', $url)) {
        return $url;
    }

    if (strpos($url, "//") === 0) {
        $scheme = parse_url($baseUrl, PHP_URL_SCHEME) ?: "https";
        return $scheme . ":" . $url;
    }

    $baseParts = parse_url($baseUrl);
    if (!is_array($baseParts) || empty($baseParts["host"])) {
        return $url;
    }

    $scheme = $baseParts["scheme"] ?? "https";
    $host = $baseParts["host"];
    $port = isset($baseParts["port"]) ? ":" . $baseParts["port"] : "";

    if (strpos($url, "/") === 0) {
        return $scheme . "://" . $host . $port . $url;
    }

    $path = $baseParts["path"] ?? "/";
    $directory = preg_replace('~/[^/]*$~', "/", $path) ?? "/";
    return $scheme . "://" . $host . $port . $directory . $url;
}

function fetchArticleImageUrl(string $articleUrl): string
{
    if (trim($articleUrl) === "") {
        return "";
    }

    static $cache = [];
    if (isset($cache[$articleUrl])) {
        return $cache[$articleUrl];
    }

    $context = stream_context_create([
        "http" => [
            "method" => "GET",
            "timeout" => 8,
            "header" => "User-Agent: mnemonic.guru RSS Reader\r\n",
        ],
    ]);

    $html = @file_get_contents($articleUrl, false, $context);
    if ($html === false || trim($html) === "") {
        $cache[$articleUrl] = "";
        return "";
    }

    $image = "";
    if (preg_match('/<meta[^>]+property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']/i', $html, $matchOg)) {
        $image = trim((string)($matchOg[1] ?? ""));
    } elseif (preg_match('/<meta[^>]+name=["\']twitter:image["\'][^>]*content=["\']([^"\']+)["\']/i', $html, $matchTwitter)) {
        $image = trim((string)($matchTwitter[1] ?? ""));
    } else {
        $image = extractFirstImageUrl($html);
    }

    $cache[$articleUrl] = absolutizeUrl($image, $articleUrl);
    return $cache[$articleUrl];
}

if (isset($_GET["page_content"])) {
    $pageKey = strtolower(trim((string)($_GET["page"] ?? "")));
    if (!isset($editablePages[$pageKey])) {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "ungueltige seite"]);
        exit;
    }

    if (!extension_loaded("pdo_sqlite")) {
        http_response_code(500);
        echo json_encode(["status" => "ERR", "msg" => "sqlite nicht verfuegbar"]);
        exit;
    }

    try {
        $pagePath = $editablePages[$pageKey];
        $fallbackContent = getPageFallbackContent($pagePath);
        $pdo = getSqliteConnection($sqliteDir, $sqlitePath);
        ensurePageSeed($pdo, $pageKey, $fallbackContent);
        $pageData = readPageContentFromStore($pdo, $pageKey);
        $content = (string)($pageData["content"] ?? "");
        $updatedAt = (string)($pageData["updated_at"] ?? "");
    } catch (Throwable $exception) {
        http_response_code(500);
        echo json_encode(["status" => "ERR", "msg" => "seiteninhalt konnte nicht geladen werden"]);
        exit;
    }
    echo json_encode([
        "status" => "OK",
        "page" => $pageKey,
        "content" => $content,
        "updated_at" => $updatedAt,
    ]);
    exit;
}

if (isset($_GET["p5js_projects"])) {
    try {
        $projects = listP5Projects($p5ProjectsDir, $p5ProjectsPublicPrefix);
    } catch (Throwable $exception) {
        http_response_code(500);
        echo json_encode(["status" => "ERR", "msg" => "p5js projekte konnten nicht geladen werden"]);
        exit;
    }
    echo json_encode([
        "status" => "OK",
        "projects" => $projects,
    ]);
    exit;
}

if (isset($_GET["p5js_project_code"])) {
    $projectSlug = trim(strtolower((string)($_GET["project"] ?? "")));
    $projectSlug = preg_replace("/[^a-z0-9\-]+/", "", $projectSlug) ?? "";
    if ($projectSlug === "") {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "ungueltiges projekt"]);
        exit;
    }

    $projectDir = rtrim($p5ProjectsDir, "/") . "/" . $projectSlug;
    if (!is_dir($projectDir)) {
        http_response_code(404);
        echo json_encode(["status" => "ERR", "msg" => "projekt nicht gefunden"]);
        exit;
    }

    $metadata = readP5ProjectMetadata($projectDir);
    $snippets = [];
    $metadataSnippets = is_array($metadata["snippets"] ?? null) ? $metadata["snippets"] : [];
    foreach ($metadataSnippets as $idx => $snippetContent) {
        $snippets[] = [
            "path" => "Snippet " . ($idx + 1),
            "language" => "javascript",
            "content" => (string)$snippetContent,
        ];
    }

    $response = [
        "status" => "OK",
        "project" => $projectSlug,
        "description" => (string)($metadata["description"] ?? ""),
        "snippets" => $snippets,
    ];

    $entryRelativePath = resolveP5EntryRelativePath($projectDir);
    if ($entryRelativePath !== "") {
        $entryAbsolutePath = $projectDir . "/" . $entryRelativePath;
        $entryContent = @file_get_contents($entryAbsolutePath);
        if ($entryContent !== false) {
            $sketchRelativePath = findRelevantSketchRelativePath(
                $projectDir,
                $entryRelativePath,
                (string)$entryContent
            );
            if ($sketchRelativePath !== "") {
                $sketchAbsolutePath = $projectDir . "/" . $sketchRelativePath;
                $sketchContent = @file_get_contents($sketchAbsolutePath);
                if ($sketchContent !== false) {
                    $response["file"] = [
                        "path" => $sketchRelativePath,
                        "language" => "javascript",
                        "content" => (string)$sketchContent,
                    ];
                }
            }
        }
    }

    echo json_encode($response);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $action = strtolower(trim((string)($_POST["action"] ?? "")));

    if ($action === "update_p5_project") {
        $projectSlug = trim(strtolower((string)($_POST["project"] ?? "")));
        $projectSlug = preg_replace("/[^a-z0-9\-]+/", "", $projectSlug) ?? "";
        if ($projectSlug === "") {
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "ungueltiges projekt"]);
            exit;
        }

        $projectDir = rtrim($p5ProjectsDir, "/") . "/" . $projectSlug;
        if (!is_dir($projectDir)) {
            http_response_code(404);
            echo json_encode(["status" => "ERR", "msg" => "projekt nicht gefunden"]);
            exit;
        }

        $file = $_FILES["file"] ?? null;
        if (is_array($file) && (int)($file["error"] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            if ((int)($file["error"] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(["status" => "ERR", "msg" => "datei konnte nicht hochgeladen werden"]);
                exit;
            }
            $size = (int)($file["size"] ?? 0);
            $extension = strtolower((string)pathinfo((string)($file["name"] ?? ""), PATHINFO_EXTENSION));
            $tmpName = (string)($file["tmp_name"] ?? "");
            if ($size <= 0 || $size > MAX_UPLOAD_BYTES) {
                http_response_code(413);
                echo json_encode(["status" => "ERR", "msg" => "ungueltige dateigroesse"]);
                exit;
            }
            if (!in_array($extension, ["html", "htm"], true)) {
                http_response_code(415);
                echo json_encode(["status" => "ERR", "msg" => "nur html dateien sind erlaubt"]);
                exit;
            }
            if ($tmpName === "" || !is_uploaded_file($tmpName)) {
                http_response_code(400);
                echo json_encode(["status" => "ERR", "msg" => "ungueltige upload-temp-datei"]);
                exit;
            }
            $entryRelativePath = resolveP5EntryRelativePath($projectDir);
            $target = $entryRelativePath !== ""
                ? $projectDir . "/" . $entryRelativePath
                : $projectDir . "/index.html";
            if (!@move_uploaded_file($tmpName, $target)) {
                http_response_code(500);
                echo json_encode(["status" => "ERR", "msg" => "datei konnte nicht gespeichert werden"]);
                exit;
            }
        }

        $description = (string)($_POST["description"] ?? "");
        $snippets = parseP5Snippets((string)($_POST["snippets"] ?? "[]"));
        if (!writeP5ProjectMetadata($projectDir, $description, $snippets)) {
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "projektmetadaten konnten nicht gespeichert werden"]);
            exit;
        }
        @touch($projectDir);
        echo json_encode(["status" => "OK", "project" => $projectSlug]);
        exit;
    }

    if ($action === "delete_p5_project") {
        $projectSlug = trim(strtolower((string)($_POST["project"] ?? "")));
        $projectSlug = preg_replace("/[^a-z0-9\-]+/", "", $projectSlug) ?? "";
        if ($projectSlug === "") {
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "ungueltiges projekt"]);
            exit;
        }
        $projectDir = rtrim($p5ProjectsDir, "/") . "/" . $projectSlug;
        if (!is_dir($projectDir)) {
            http_response_code(404);
            echo json_encode(["status" => "ERR", "msg" => "projekt nicht gefunden"]);
            exit;
        }
        if (!removeDirectoryRecursive($projectDir)) {
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "projekt konnte nicht geloescht werden"]);
            exit;
        }
        echo json_encode(["status" => "OK", "project" => $projectSlug]);
        exit;
    }

    if ($action === "upload_p5_file") {
        $projectNameRaw = trim((string)($_POST["project_name"] ?? ""));
        $projectNameSafe = sanitizePathSegment($projectNameRaw);
        if ($projectNameSafe === "") {
            $projectNameSafe = "p5-projekt";
        }
        $projectNameLower = function_exists("mb_strtolower")
            ? mb_strtolower($projectNameSafe, "UTF-8")
            : strtolower($projectNameSafe);
        $projectSlug = (string)preg_replace("/[^a-z0-9]+/", "-", $projectNameLower);
        $projectSlug = trim($projectSlug, "-");
        if ($projectSlug === "") {
            $projectSlug = "p5-projekt";
        }

        $replace = strtolower(trim((string)($_POST["replace"] ?? "")));
        $shouldReplace = in_array($replace, ["1", "true", "yes", "on"], true);
        $file = $_FILES["file"] ?? ($_FILES["p5_file"] ?? null);
        if (!is_array($file) || !isset($file["tmp_name"])) {
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "keine datei im feld file"]);
            exit;
        }

        $uploadError = (int)($file["error"] ?? UPLOAD_ERR_NO_FILE);
        if ($uploadError !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "datei konnte nicht hochgeladen werden"]);
            exit;
        }

        $size = (int)($file["size"] ?? 0);
        if ($size <= 0 || $size > MAX_UPLOAD_BYTES) {
            http_response_code(413);
            echo json_encode(["status" => "ERR", "msg" => "ungueltige dateigroesse"]);
            exit;
        }

        $tmpName = (string)($file["tmp_name"] ?? "");
        if ($tmpName === "" || !is_uploaded_file($tmpName)) {
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "ungueltige upload-temp-datei"]);
            exit;
        }

        $originalName = trim((string)($file["name"] ?? ""));
        $extension = strtolower((string)pathinfo($originalName, PATHINFO_EXTENSION));
        if (!in_array($extension, ["html", "htm"], true)) {
            http_response_code(415);
            echo json_encode(["status" => "ERR", "msg" => "nur html dateien sind erlaubt"]);
            exit;
        }

        if (!is_dir($p5ProjectsDir) && !@mkdir($p5ProjectsDir, 0755, true) && !is_dir($p5ProjectsDir)) {
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "p5js basisverzeichnis konnte nicht erstellt werden"]);
            exit;
        }

        $projectDir = rtrim($p5ProjectsDir, "/") . "/" . $projectSlug;
        if (is_dir($projectDir)) {
            if (!$shouldReplace) {
                http_response_code(409);
                echo json_encode(["status" => "ERR", "msg" => "projektverzeichnis existiert bereits"]);
                exit;
            }
            if (!removeDirectoryRecursive($projectDir)) {
                http_response_code(500);
                echo json_encode(["status" => "ERR", "msg" => "bestehendes verzeichnis konnte nicht ersetzt werden"]);
                exit;
            }
        }

        if (!@mkdir($projectDir, 0755, true) && !is_dir($projectDir)) {
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "projektverzeichnis konnte nicht erstellt werden"]);
            exit;
        }

        $target = $projectDir . "/index.html";
        if (!@move_uploaded_file($tmpName, $target)) {
            removeDirectoryRecursive($projectDir);
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "datei konnte nicht gespeichert werden"]);
            exit;
        }

        $description = (string)($_POST["description"] ?? "");
        $snippets = parseP5Snippets((string)($_POST["snippets"] ?? "[]"));
        if (!writeP5ProjectMetadata($projectDir, $description, $snippets)) {
            removeDirectoryRecursive($projectDir);
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "projektmetadaten konnten nicht gespeichert werden"]);
            exit;
        }

        $entryUrl = resolveP5EntryPublicPath($projectDir, $projectSlug, $p5ProjectsPublicPrefix);
        if ($entryUrl === "") {
            removeDirectoryRecursive($projectDir);
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "kein html einstiegspunkt gefunden"]);
            exit;
        }

        echo json_encode([
            "status" => "OK",
            "project" => $projectSlug,
            "entry_url" => $entryUrl,
        ]);
        exit;
    }

    if ($action === "upload_p5_directory") {
        $projectNameRaw = trim((string)($_POST["project_name"] ?? ""));
        $projectNameSafe = sanitizePathSegment($projectNameRaw);
        if ($projectNameSafe === "") {
            $projectNameSafe = "p5-projekt";
        }
        $projectNameLower = function_exists("mb_strtolower")
            ? mb_strtolower($projectNameSafe, "UTF-8")
            : strtolower($projectNameSafe);
        $projectSlug = (string)preg_replace("/[^a-z0-9]+/", "-", $projectNameLower);
        $projectSlug = trim($projectSlug, "-");
        if ($projectSlug === "") {
            $projectSlug = "p5-projekt";
        }

        $replace = strtolower(trim((string)($_POST["replace"] ?? "")));
        $shouldReplace = in_array($replace, ["1", "true", "yes", "on"], true);

        $files = $_FILES["files"] ?? null;
        if (!is_array($files) || !isset($files["tmp_name"])) {
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "keine dateien im feld files"]);
            exit;
        }

        $names = $files["name"];
        $tmpNames = $files["tmp_name"];
        $errors = $files["error"];
        $sizes = $files["size"];
        if (!is_array($names)) {
            $names = [$names];
            $tmpNames = [$tmpNames];
            $errors = [$errors];
            $sizes = [$sizes];
        }

        $relativePaths = $_POST["relative_paths"] ?? [];
        if (!is_array($relativePaths)) {
            $relativePaths = [$relativePaths];
        }

        if (!is_dir($p5ProjectsDir) && !@mkdir($p5ProjectsDir, 0755, true) && !is_dir($p5ProjectsDir)) {
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "p5js basisverzeichnis konnte nicht erstellt werden"]);
            exit;
        }

        $projectDir = rtrim($p5ProjectsDir, "/") . "/" . $projectSlug;
        if (is_dir($projectDir)) {
            if (!$shouldReplace) {
                http_response_code(409);
                echo json_encode(["status" => "ERR", "msg" => "projektverzeichnis existiert bereits"]);
                exit;
            }
            if (!removeDirectoryRecursive($projectDir)) {
                http_response_code(500);
                echo json_encode(["status" => "ERR", "msg" => "bestehendes verzeichnis konnte nicht ersetzt werden"]);
                exit;
            }
        }

        if (!@mkdir($projectDir, 0755, true) && !is_dir($projectDir)) {
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "projektverzeichnis konnte nicht erstellt werden"]);
            exit;
        }

        $allowedExtensions = [
            "html", "htm", "js", "mjs", "css", "json", "txt", "md",
            "png", "jpg", "jpeg", "gif", "webp", "svg", "ico",
            "woff", "woff2", "ttf", "otf", "map",
            "mp3", "wav", "ogg", "mp4", "webm",
        ];
        $activeIndices = [];
        for ($i = 0; $i < count($tmpNames); $i++) {
            $error = (int)($errors[$i] ?? UPLOAD_ERR_NO_FILE);
            if ($error !== UPLOAD_ERR_NO_FILE) {
                $activeIndices[] = $i;
            }
        }
        if (count($activeIndices) < 1) {
            removeDirectoryRecursive($projectDir);
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "keine dateien im upload enthalten"]);
            exit;
        }

        $preparedRelativePaths = [];
        foreach ($activeIndices as $index) {
            $rawRelativePath = (string)($relativePaths[$index] ?? $names[$index] ?? "");
            $normalizedRelativePath = normalizeRelativeUploadPath($rawRelativePath);
            if ($normalizedRelativePath === "") {
                removeDirectoryRecursive($projectDir);
                http_response_code(400);
                echo json_encode(["status" => "ERR", "msg" => "ungueltiger relativer dateipfad"]);
                exit;
            }
            $preparedRelativePaths[$index] = $normalizedRelativePath;
        }

        // Falls Browser den gewaehlten Hauptordner trotzdem mitsendet: einmal global entfernen.
        $sharedRoot = null;
        $canStripSharedRoot = true;
        foreach ($activeIndices as $index) {
            $parts = explode("/", (string)$preparedRelativePaths[$index]);
            if (count($parts) < 2) {
                $canStripSharedRoot = false;
                break;
            }
            if ($sharedRoot === null) {
                $sharedRoot = (string)$parts[0];
                continue;
            }
            if ($sharedRoot !== (string)$parts[0]) {
                $canStripSharedRoot = false;
                break;
            }
        }
        if ($canStripSharedRoot && $sharedRoot !== null && $sharedRoot !== "") {
            foreach ($activeIndices as $index) {
                $parts = explode("/", (string)$preparedRelativePaths[$index]);
                $preparedRelativePaths[$index] = implode("/", array_slice($parts, 1));
            }
        }

        $movedCount = 0;
        $totalBytes = 0;
        $fileCount = count($tmpNames);
        for ($i = 0; $i < $fileCount; $i++) {
            $error = (int)($errors[$i] ?? UPLOAD_ERR_NO_FILE);
            if ($error === UPLOAD_ERR_NO_FILE) {
                continue;
            }
            if ($error !== UPLOAD_ERR_OK) {
                removeDirectoryRecursive($projectDir);
                http_response_code(400);
                echo json_encode(["status" => "ERR", "msg" => "eine datei konnte nicht hochgeladen werden"]);
                exit;
            }

            $size = (int)($sizes[$i] ?? 0);
            if ($size <= 0 || $size > MAX_UPLOAD_BYTES) {
                removeDirectoryRecursive($projectDir);
                http_response_code(413);
                echo json_encode(["status" => "ERR", "msg" => "ungueltige dateigroesse im upload"]);
                exit;
            }
            $totalBytes += $size;
            if ($totalBytes > P5_MAX_TOTAL_UPLOAD_BYTES) {
                removeDirectoryRecursive($projectDir);
                http_response_code(413);
                echo json_encode(["status" => "ERR", "msg" => "upload verzeichnis ist zu gross"]);
                exit;
            }

            $tmpName = (string)($tmpNames[$i] ?? "");
            if ($tmpName === "" || !is_uploaded_file($tmpName)) {
                removeDirectoryRecursive($projectDir);
                http_response_code(400);
                echo json_encode(["status" => "ERR", "msg" => "ungueltige upload-temp-datei"]);
                exit;
            }

            $normalizedRelativePath = (string)($preparedRelativePaths[$i] ?? "");
            if ($normalizedRelativePath === "") {
                removeDirectoryRecursive($projectDir);
                http_response_code(400);
                echo json_encode(["status" => "ERR", "msg" => "ungueltiger relativer dateipfad"]);
                exit;
            }

            $extension = strtolower((string)pathinfo($normalizedRelativePath, PATHINFO_EXTENSION));
            if ($extension === "" || !in_array($extension, $allowedExtensions, true)) {
                removeDirectoryRecursive($projectDir);
                http_response_code(415);
                echo json_encode(["status" => "ERR", "msg" => "dateityp nicht erlaubt"]);
                exit;
            }

            $target = $projectDir . "/" . $normalizedRelativePath;
            $targetParent = dirname($target);
            if (!is_dir($targetParent) && !@mkdir($targetParent, 0755, true) && !is_dir($targetParent)) {
                removeDirectoryRecursive($projectDir);
                http_response_code(500);
                echo json_encode(["status" => "ERR", "msg" => "unterverzeichnis konnte nicht erstellt werden"]);
                exit;
            }

            if (!@move_uploaded_file($tmpName, $target)) {
                removeDirectoryRecursive($projectDir);
                http_response_code(500);
                echo json_encode(["status" => "ERR", "msg" => "datei konnte nicht gespeichert werden"]);
                exit;
            }
            $movedCount++;
        }

        if ($movedCount < 1) {
            removeDirectoryRecursive($projectDir);
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "keine dateien im upload enthalten"]);
            exit;
        }

        $entryUrl = resolveP5EntryPublicPath($projectDir, $projectSlug, $p5ProjectsPublicPrefix);
        if ($entryUrl === "") {
            removeDirectoryRecursive($projectDir);
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "kein html einstiegspunkt im verzeichnis gefunden"]);
            exit;
        }

        echo json_encode([
            "status" => "OK",
            "project" => $projectSlug,
            "entry_url" => $entryUrl,
            "files_uploaded" => $movedCount,
        ]);
        exit;
    }

    if ($action === "save_page") {
        $pageKey = strtolower(trim((string)($_POST["page"] ?? "")));
        if (!isset($editablePages[$pageKey])) {
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "ungueltige seite"]);
            exit;
        }

        $content = (string)($_POST["content"] ?? "");
        if (strlen($content) > 200000) {
            http_response_code(413);
            echo json_encode(["status" => "ERR", "msg" => "inhalt zu gross"]);
            exit;
        }

        if (!extension_loaded("pdo_sqlite")) {
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "sqlite nicht verfuegbar"]);
            exit;
        }

        try {
            $pagePath = $editablePages[$pageKey];
            $fallbackContent = getPageFallbackContent($pagePath);
            $pdo = getSqliteConnection($sqliteDir, $sqlitePath);
            ensurePageSeed($pdo, $pageKey, $fallbackContent);
            savePageContentToStore($pdo, $pageKey, $content);
        } catch (Throwable $exception) {
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "seite konnte nicht in sqlite gespeichert werden"]);
            exit;
        }

        echo json_encode([
            "status" => "OK",
            "page" => $pageKey
        ]);
        exit;
    }

    $imgtypRaw = strtolower(trim((string)($_POST["imgtyp"] ?? "fractals")));
    $imgtyp = $typeAliases[$imgtypRaw] ?? $imgtypRaw;
    if (!isset($typeToFolder[$imgtyp])) {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "ungueltiger imgtyp"]);
        exit;
    }

    $file = $_FILES["image"] ?? ($_FILES["file"] ?? null);
    if (empty($file)) {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "keine datei im feld image/file"]);
        exit;
    }

    $uploadError = (int)($file["error"] ?? UPLOAD_ERR_NO_FILE);
    if ($uploadError !== UPLOAD_ERR_OK) {
        $uploadErrorMsg = "upload fehlgeschlagen";
        if ($uploadError === UPLOAD_ERR_INI_SIZE || $uploadError === UPLOAD_ERR_FORM_SIZE) {
            $uploadErrorMsg = "datei zu gross (php upload limit)";
        } elseif ($uploadError === UPLOAD_ERR_PARTIAL) {
            $uploadErrorMsg = "datei wurde nur teilweise hochgeladen";
        } elseif ($uploadError === UPLOAD_ERR_NO_FILE) {
            $uploadErrorMsg = "keine datei hochgeladen";
        } elseif ($uploadError === UPLOAD_ERR_NO_TMP_DIR) {
            $uploadErrorMsg = "php temp-verzeichnis fehlt";
        } elseif ($uploadError === UPLOAD_ERR_CANT_WRITE) {
            $uploadErrorMsg = "datei konnte nicht auf disk geschrieben werden";
        } elseif ($uploadError === UPLOAD_ERR_EXTENSION) {
            $uploadErrorMsg = "php extension hat upload gestoppt";
        }
        http_response_code(400);
        echo json_encode([
            "status" => "ERR",
            "msg" => $uploadErrorMsg,
            "upload_error" => $uploadError
        ]);
        exit;
    }

    if (($file["size"] ?? 0) <= 0 || $file["size"] > MAX_UPLOAD_BYTES) {
        http_response_code(413);
        echo json_encode(["status" => "ERR", "msg" => "datei zu gross oder leer"]);
        exit;
    }

    $tmp = $file["tmp_name"];
    if (!is_uploaded_file($tmp)) {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "ungueltige upload-temp-datei"]);
        exit;
    }
    $mime = mime_content_type($tmp);
    $allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!in_array($mime, $allowedMimes, true)) {
        http_response_code(415);
        echo json_encode(["status" => "ERR", "msg" => "format nicht erlaubt"]);
        exit;
    }

    $targetDir = $typeToFolder[$imgtyp];
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0755, true);
    }

    $source = @imagecreatefromstring(file_get_contents($tmp));
    if (!$source) {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "bild ungueltig"]);
        exit;
    }

    $originalName = (string)($file["name"] ?? "upload.jpg");
    $baseName = sanitizeUploadBaseName($originalName);
    $filename = $baseName . ".jpg";
    $counter = 2;
    while (file_exists(rtrim($targetDir, "/") . "/" . $filename)) {
        $filename = $baseName . "-" . $counter . ".jpg";
        $counter++;
    }

    $target = rtrim($targetDir, "/") . "/" . $filename;
    if (!imagejpeg($source, $target, 90)) {
        imagedestroy($source);
        http_response_code(500);
        echo json_encode(["status" => "ERR", "msg" => "speichern fehlgeschlagen"]);
        exit;
    }

    if (in_array($imgtyp, ["fractals", "digital", "fotos"], true)) {
        $thumbDir = rtrim($targetDir, "/") . "/tn";
        if (!is_dir($thumbDir) && !mkdir($thumbDir, 0755, true)) {
            @unlink($target);
            imagedestroy($source);
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "thumbnail-verzeichnis fehlt"]);
            exit;
        }

        $srcWidth = imagesx($source);
        $srcHeight = imagesy($source);
        if ($srcWidth <= 0 || $srcHeight <= 0) {
            @unlink($target);
            imagedestroy($source);
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "ungueltige bildgroesse"]);
            exit;
        }

        $thumbScale = min(THUMB_MAX_EDGE / $srcWidth, THUMB_MAX_EDGE / $srcHeight, 1);
        $thumbWidth = max(1, (int)round($srcWidth * $thumbScale));
        $thumbHeight = max(1, (int)round($srcHeight * $thumbScale));
        $thumb = imagecreatetruecolor($thumbWidth, $thumbHeight);
        if (!$thumb) {
            @unlink($target);
            imagedestroy($source);
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "thumbnail-erstellung fehlgeschlagen"]);
            exit;
        }

        if (!imagecopyresampled($thumb, $source, 0, 0, 0, 0, $thumbWidth, $thumbHeight, $srcWidth, $srcHeight)) {
            imagedestroy($thumb);
            @unlink($target);
            imagedestroy($source);
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "thumbnail-resize fehlgeschlagen"]);
            exit;
        }

        $thumbTarget = $thumbDir . "/" . $filename;
        if (!imagejpeg($thumb, $thumbTarget, 85)) {
            imagedestroy($thumb);
            @unlink($target);
            imagedestroy($source);
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "thumbnail-speichern fehlgeschlagen"]);
            exit;
        }
        imagedestroy($thumb);
    }
    imagedestroy($source);

    $publicPath = str_replace($baseDir, "", $target);
    if (strpos($publicPath, "/") !== 0) {
        $publicPath = "/" . ltrim($publicPath, "/");
    }
    echo json_encode([
        "status" => "OK",
        "img" => $publicPath,
        "typ" => $imgtyp
    ]);
    exit;
}

$rssFeeds = [
    "security" => "https://www.heise.de/security/feed.xml",
    "heiseonline" => "https://www.heise.de/rss/heise-atom.xml",
    "telepolis" => "https://www.telepolis.de/news-atom.xml",
];

$rdapIpBootstrapUrl = "https://rdap-bootstrap.arin.net/bootstrap/ip";
$whoisRapidHost = "zozor54-whois-lookup-v1.p.rapidapi.com";
$whoisRapidApiUrl = "https://zozor54-whois-lookup-v1.p.rapidapi.com/";
$whoisRapidApiKey = getenv("RAPIDAPI_WHOIS_KEY") ?: "177394671amsh7d26c6624bc7d58p1e3590jsn7c8595e22d85";

if (isset($_GET["whois"])) {
    $mode = strtolower(trim((string)($_GET["mode"] ?? "whois")));
    if ($mode !== "whois" && $mode !== "reverse") {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "ungueltiger modus"]);
        exit;
    }

    $targetLabel = "";
    $url = "";
    $headers = "Accept: application/json\r\n";
    if ($mode === "reverse") {
        $ip = trim((string)($_GET["ip"] ?? ""));
        if ($ip === "") {
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "ip fehlt"]);
            exit;
        }
        if (filter_var($ip, FILTER_VALIDATE_IP) === false) {
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "ungueltige ip"]);
            exit;
        }
        $targetLabel = $ip;
        $url = $rdapIpBootstrapUrl . "/" . rawurlencode($ip);
    } else {
        if (trim($whoisRapidApiKey) === "") {
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "rapidapi key fehlt"]);
            exit;
        }
        $domain = strtolower(trim((string)($_GET["domain"] ?? "")));
        if ($domain === "") {
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "domain fehlt"]);
            exit;
        }
        if (!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i', $domain)) {
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "ungueltige domain"]);
            exit;
        }
        $targetLabel = $domain;
        $url = $whoisRapidApiUrl . "?" . http_build_query([
            "domain" => $domain,
            "format" => "json",
            "_forceRefresh" => "0",
        ]);
        $headers =
            "x-rapidapi-key: " . $whoisRapidApiKey . "\r\n" .
            "x-rapidapi-host: " . $whoisRapidHost . "\r\n" .
            "Accept: application/json\r\n";
    }

    $context = stream_context_create([
        "http" => [
            "method" => "GET",
            "timeout" => 15,
            "ignore_errors" => true,
            "follow_location" => 1,
            "max_redirects" => 5,
            "header" => $mode === "reverse"
                ? "Accept: application/rdap+json, application/json\r\n"
                : $headers,
        ],
    ]);

    $providerStatusCode = 0;
    $raw = @file_get_contents($url, false, $context);
    $providerHeaders = isset($http_response_header) && is_array($http_response_header)
        ? $http_response_header
        : [];
    foreach ($providerHeaders as $providerHeaderLine) {
        if (preg_match('/^HTTP\/\S+\s+(\d{3})\b/', (string)$providerHeaderLine, $matches)) {
            $providerStatusCode = (int)$matches[1];
            break;
        }
    }

    if ($raw === false) {
        http_response_code(502);
        echo json_encode([
            "status" => "ERR",
            "msg" => "whois provider request fehlgeschlagen",
            "provider_status" => $providerStatusCode,
            "provider_url" => $url,
        ]);
        exit;
    }

    if (trim($raw) === "") {
        http_response_code(502);
        echo json_encode([
            "status" => "ERR",
            "msg" => "whois provider hat leer geantwortet",
            "provider_status" => $providerStatusCode,
            "provider_url" => $url,
        ]);
        exit;
    }

    $parsed = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($parsed)) {
        http_response_code(502);
        echo json_encode([
            "status" => "ERR",
            "msg" => "ungueltige provider-antwort",
            "provider_status" => $providerStatusCode,
            "provider_url" => $url,
            "provider_raw" => mb_substr($raw, 0, 1000),
        ]);
        exit;
    }

    $providerErrorMessage = "";
    foreach (["msg", "message", "error", "detail", "description"] as $providerErrorKey) {
        if (isset($parsed[$providerErrorKey]) && is_scalar($parsed[$providerErrorKey])) {
            $providerErrorMessage = trim((string)$parsed[$providerErrorKey]);
            if ($providerErrorMessage !== "") {
                break;
            }
        }
    }

    if ($providerStatusCode >= 400) {
        http_response_code(502);
        echo json_encode([
            "status" => "ERR",
            "msg" => $providerErrorMessage !== ""
                ? "whois provider fehler: " . $providerErrorMessage
                : "whois provider fehler",
            "provider_status" => $providerStatusCode,
            "provider_url" => $url,
            "provider_response" => $parsed,
        ]);
        exit;
    }

    echo json_encode([
        "status" => "OK",
        "mode" => $mode,
        "target" => $targetLabel,
        "provider" => $mode === "reverse" ? "rdap.org" : "rapidapi-whois",
        "result" => $parsed,
    ]);
    exit;
}

if (isset($_GET["rss"])) {
    $rssKey = strtolower(trim((string)($_GET["rss"] ?? "")));
    $limit = (int)($_GET["limit"] ?? 20);
    if ($limit < 1) {
        $limit = 1;
    }
    if ($limit > 20) {
        $limit = 20;
    }
    if (!isset($rssFeeds[$rssKey])) {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "ungueltiger rss feed"]);
        exit;
    }

    $context = stream_context_create([
        "http" => [
            "method" => "GET",
            "timeout" => 8,
            "header" => "User-Agent: mnemonic.guru RSS Reader\r\n",
        ],
    ]);

    $rawFeed = @file_get_contents($rssFeeds[$rssKey], false, $context);
    if ($rawFeed === false || trim($rawFeed) === "") {
        http_response_code(502);
        echo json_encode(["status" => "ERR", "msg" => "rss feed nicht erreichbar"]);
        exit;
    }

    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($rawFeed);
    libxml_clear_errors();
    if ($xml === false) {
        http_response_code(502);
        echo json_encode(["status" => "ERR", "msg" => "rss feed ungueltig"]);
        exit;
    }

    $items = [];

    // Classic RSS 2.0 parsing (<channel><item>)
    if (isset($xml->channel->item)) {
        foreach ($xml->channel->item as $entry) {
            $rawDescription = (string)($entry->description ?? "");
            $items[] = [
                "title" => trim((string)($entry->title ?? "")),
                "link" => trim((string)($entry->link ?? "")),
                "pubDate" => trim((string)($entry->pubDate ?? "")),
                "description" => trim(html_entity_decode(strip_tags($rawDescription), ENT_QUOTES | ENT_HTML5, "UTF-8")),
                "image" => extractFirstImageUrl($rawDescription),
            ];
            if (count($items) >= $limit) {
                break;
            }
        }
    }

    // Atom parsing (<feed><entry>) e.g. heise.de feeds
    if (count($items) === 0) {
        $atomEntries = $xml->xpath("//*[local-name()='entry']");
        if (is_array($atomEntries)) {
            foreach ($atomEntries as $entry) {
                $link = "";
                $linkNodes = $entry->xpath("./*[local-name()='link']");
                if (is_array($linkNodes)) {
                    foreach ($linkNodes as $linkNode) {
                        $attributes = $linkNode->attributes();
                        $rel = trim((string)($attributes["rel"] ?? ""));
                        $href = trim((string)($attributes["href"] ?? ""));
                        if ($href === "") {
                            continue;
                        }
                        if ($rel === "" || $rel === "alternate") {
                            $link = $href;
                            break;
                        }
                        if ($link === "") {
                            $link = $href;
                        }
                    }
                }

                $summaryNodes = $entry->xpath("./*[local-name()='summary']");
                $contentNodes = $entry->xpath("./*[local-name()='content']");
                $updatedNodes = $entry->xpath("./*[local-name()='updated']");
                $publishedNodes = $entry->xpath("./*[local-name()='published']");
                $titleNodes = $entry->xpath("./*[local-name()='title']");

                $rawDescription = "";
                if (is_array($summaryNodes) && isset($summaryNodes[0])) {
                    $rawDescription = (string)$summaryNodes[0];
                } elseif (is_array($contentNodes) && isset($contentNodes[0])) {
                    $rawDescription = (string)$contentNodes[0];
                }

                $rawContent = "";
                if (is_array($contentNodes) && isset($contentNodes[0])) {
                    $rawContent = (string)$contentNodes[0];
                }

                $pubDate = "";
                if (is_array($updatedNodes) && isset($updatedNodes[0])) {
                    $pubDate = trim((string)$updatedNodes[0]);
                } elseif (is_array($publishedNodes) && isset($publishedNodes[0])) {
                    $pubDate = trim((string)$publishedNodes[0]);
                }

                $title = "";
                if (is_array($titleNodes) && isset($titleNodes[0])) {
                    $title = trim((string)$titleNodes[0]);
                }

                $items[] = [
                    "title" => $title,
                    "link" => $link,
                    "pubDate" => $pubDate,
                    "description" => trim(html_entity_decode(strip_tags($rawDescription), ENT_QUOTES | ENT_HTML5, "UTF-8")),
                    "image" => extractFirstImageUrl($rawContent !== "" ? $rawContent : $rawDescription),
                ];

                if (count($items) >= $limit) {
                    break;
                }
            }
        }
    }

    // Feeds wie Telepolis enthalten im Atom-Feed oft keine Bilder.
    // Dann wird das erste Artikelbild per URL nachgeladen.
    for ($i = 0; $i < count($items); $i++) {
        if (!empty($items[$i]["image"])) {
            continue;
        }
        $articleLink = trim((string)($items[$i]["link"] ?? ""));
        if ($articleLink === "") {
            continue;
        }
        $items[$i]["image"] = fetchArticleImageUrl($articleLink);
    }

    echo json_encode([
        "status" => "OK",
        "feed" => $rssKey,
        "items" => $items,
    ]);
    exit;
}

$path = $baseDir . "/img/fractals";
if (isset($_GET["digital"])) {
    $path = $baseDir . "/img/digital";
} elseif (isset($_GET["fotos"])) {
    $path = $baseDir . "/img/fotos";
}

if (isset($_GET["latest"])) {
    $dirArray = [];
    $myDirectory = @opendir($path);
    if ($myDirectory !== false) {
        while (($entryName = readdir($myDirectory)) !== false) {
            if ($entryName === "." || $entryName === "..") {
                continue;
            }
            $fullPath = $path . "/" . $entryName;
            if (!is_file($fullPath)) {
                continue;
            }
            if (!preg_match("/\.(jpg|jpeg|png|gif|webp)$/i", $entryName)) {
                continue;
            }
            $dirArray[] = [
                "name" => $entryName,
                "mtime" => @filemtime($fullPath) ?: 0
            ];
        }
        closedir($myDirectory);
    }

    usort($dirArray, function ($a, $b) {
        return $b["mtime"] <=> $a["mtime"];
    });

    $sortedNames = array_map(function ($entry) {
        return $entry["name"];
    }, $dirArray);

    echo json_encode($sortedNames);
    exit;
}

// Legacy-Listing wie vorher (alphabetisch, inkl. Verzeichnis-Eintraege)
$dirArray = [];
$myDirectory = @opendir($path);
if ($myDirectory !== false) {
    while (($entryName = readdir($myDirectory)) !== false) {
        $dirArray[] = $entryName;
    }
    closedir($myDirectory);
}
rsort($dirArray);
echo json_encode($dirArray);
