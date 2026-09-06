<?php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");

$radios = [
    "expres" => "https://stream.bauermedia.sk/expres-hi.mp3",
    "melody" => "https://stream.bauermedia.sk/melody-hi.mp3"
];

$radio = $_GET["radio"] ?? "";

if (!isset($radios[$radio])) {
    http_response_code(400);
    echo json_encode([
        "error" => "Neznáme rádio"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$url = $radios[$radio];

$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HEADER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_USERAGENT => "Počúvam Rádiá",
    CURLOPT_HTTPHEADER => [
        "Icy-MetaData: 1"
    ]
]);

$response = curl_exec($ch);

if ($response === false) {
    echo json_encode([
        "error" => "Nepodarilo sa pripojiť k rádiu"
    ], JSON_UNESCAPED_UNICODE);
    curl_close($ch);
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

curl_close($ch);

$metaInt = null;

if (preg_match('/icy-metaint:\s*(\d+)/i', $headers, $match)) {
    $metaInt = (int)$match[1];
}

if (!$metaInt) {
    echo json_encode([
        "error" => "Rádio neposkytuje ICY metadata"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (strlen($body) < $metaInt + 1) {
    echo json_encode([
        "error" => "Metadata sa nepodarilo načítať"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$metadataLengthByte = ord($body[$metaInt]);
$metadataLength = $metadataLengthByte * 16;

if ($metadataLength <= 0) {
    echo json_encode([
        "title" => "",
        "artist" => "",
        "raw" => ""
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$metadata = substr(
    $body,
    $metaInt + 1,
    $metadataLength
);

$metadata = trim($metadata, "\0");

$title = "";

if (preg_match("/StreamTitle='([^']*)'/i", $metadata, $match)) {
    $title = trim($match[1]);
}

$artist = "";
$song = $title;

if (strpos($title, " - ") !== false) {
    [$artist, $song] = explode(" - ", $title, 2);
}

echo json_encode([
    "title" => trim($song),
    "artist" => trim($artist),
    "raw" => $title
], JSON_UNESCAPED_UNICODE);
