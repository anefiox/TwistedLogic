
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { StoryMessage } from '../types';

const escapeXml = (unsafe: string) => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

export const generateEpub = async (history: StoryMessage[], title: string = "Twisted Logic Episode") => {
  const zip = new JSZip();
  const timestamp = new Date().toISOString();

  // 1. Mimetype (must be first, no compression)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 2. META-INF/container.xml
  zip.folder("META-INF")?.file("container.xml", `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
   <rootfiles>
      <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
   </rootfiles>
</container>`);

  // 3. OEBPS Folder
  const oebps = zip.folder("OEBPS");
  const imagesFolder = oebps?.folder("images");

  // Generate Content
  let contentBody = '';
  let imageManifestItems = '';
  
  history.forEach((msg, index) => {
    const roleClass = msg.role === 'user' ? 'user' : 'model';
    const roleName = msg.role === 'user' ? 'The Protagonist' : 'The Curator';
    
    let imageHtml = '';
    if (msg.image) {
      // Assuming standard base64 data URI format from geminiService
      // Format: data:image/png;base64,.....
      const base64Data = msg.image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      const imageName = `img_${index}.png`;
      
      // Add file to zip
      imagesFolder?.file(imageName, base64Data, { base64: true });
      
      // Add to manifest string
      imageManifestItems += `    <item id="img_${index}" href="images/${imageName}" media-type="image/png"/>\n`;
      
      // Create HTML tag
      imageHtml = `<div class="scene-image"><img src="images/${imageName}" alt="Scene Visualization" /></div>`;
    }

    contentBody += `
      <div class="message ${roleClass}">
        <p class="role"><strong>${roleName}</strong></p>
        <p>${escapeXml(msg.text).replace(/\n/g, '<br/>')}</p>
        ${imageHtml}
        ${msg.role === 'model' ? '<hr/>' : ''}
      </div>
    `;
  });

  const xhtmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <title>${title}</title>
  <style>
    body { font-family: monospace; background-color: #fff; color: #000; line-height: 1.5; }
    h1 { text-align: center; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .message { margin-bottom: 20px; }
    .role { font-size: 0.8em; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .user { text-align: right; padding-left: 20%; }
    .model { text-align: left; padding-right: 10%; }
    .scene-image { text-align: center; margin: 15px 0; }
    .scene-image img { max-width: 100%; border: 1px solid #ccc; filter: grayscale(100%) contrast(120%); }
    hr { border: 0; border-top: 1px dashed #ccc; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p style="text-align: center; font-style: italic; margin-bottom: 40px;">Recorded: ${new Date().toLocaleDateString()}</p>
  ${contentBody}
</body>
</html>`;

  oebps?.file("story.xhtml", xhtmlContent);

  // 4. Content.opf
  const opfContent = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>Twisted Logic AI</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">urn:uuid:${crypto.randomUUID()}</dc:identifier>
    <meta property="dcterms:modified">${timestamp}</meta>
  </metadata>
  <manifest>
    <item id="story" href="story.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${imageManifestItems}
  </manifest>
  <spine toc="ncx">
    <itemref idref="story"/>
  </spine>
</package>`;

  oebps?.file("content.opf", opfContent);

  // 5. TOC.ncx (for older readers compatibility)
  const ncxContent = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:12345"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${title}</text>
  </docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel>
        <text>The Story</text>
      </navLabel>
      <content src="story.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;

  oebps?.file("toc.ncx", ncxContent);

  // Generate Blob
  const blob = await zip.generateAsync({ type: "blob" });
  
  // Compatibility fix for esm.sh import of file-saver
  // It handles both cases where FileSaver is the function (default) or an object containing saveAs
  const saveFile = (FileSaver as any).saveAs || FileSaver;
  saveFile(blob, `Twisted_Logic_${Date.now()}.epub`);
};
