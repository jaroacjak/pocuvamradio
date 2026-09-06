<?php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");

// Povolené rádiá
$streams = [
    "expres" => "https://stream.bauermedia.sk/expres-hi.mp3",
    "melody" => "https://stream.bauermedia.sk/melody-hi.mp3"
];

$radio = $_GET["radio"] ?? "expres";

if (!isset($streams[$radio])) {
    http_response_code(400);
    echo json_encode([
        "error" => "Neznáme rádio"
    ]);
    exit;
}

$url = $streams[$radio];

$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_CONNECTTIMEOUT => 10,

    // Požiadame stream o ICY metadata
    CURLOPT_HTTPHEADER => [
        "Icy-MetaData: 1",
        "User-Agent: PocuvamRadia/1.0"
    ]
]);

$data = curl_exec($ch);

if ($data === false) {
    echo json_encode([
        "error" => "Stream sa nepodarilo načítať"
    ]);
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = substr($data, 0, $headerSize);
$body = substr($data, $headerSize);

curl_close($ch);

// Nájdeme interval metadát
$metaInt = null;

if (preg_match('/icy-metaint:\s*(\d+)/i', $headers, $match)) {
    $metaInt = (int)$match[1];
}

if (!$metaInt) {
    echo json_encode([
        "error" => "Tento stream neposkytuje ICY metadata"
    ]);
    exit;
}

// Potrebujeme dostať prvý blok metadata
if (strlen($body) <= $metaInt) {
    echo json_encode([
        "error" => "Stream neposkytol dostatok dát"
    ]);
    exit;
}

$metadataLengthByte = ord($body[$metaInt]);

$metadataLength = $metadataLengthByte * 16;

$metadata = substr(
    $body,
    $metaInt + 1,
    $metadataLength
);

// Hľadáme StreamTitle
$title = "";

if (preg_match(
    "/StreamTitle='(.*?)';/i",
    $metadata,
    $match
)) {
    $title = trim($match[1]);
}

if ($title === "") {
    echo json_encode([
        "title" => "",
        "artist" => "",
        "raw" => "",
        "error" => "Stream momentálne neposkytol názov skladby"
    ]);
    exit;
}

// Väčšina rádií používa formát:
// Interpret - Názov skladby

$artist = "";
$song = $title;

$parts = explode(" - ", $title, 2);

if (count($parts) === 2) {
    $artist = trim($parts[0]);
    $song = trim($parts[1]);
}

echo json_encode([
    "title" => $song,
    "artist" => $artist,
    "raw" => $title
], JSON_UNESCAPED_UNICODE);
?>
