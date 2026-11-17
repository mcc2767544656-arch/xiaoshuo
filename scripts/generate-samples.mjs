import { mkdir, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
const root = new URL('../public/samples/', import.meta.url);
await mkdir(root, { recursive: true });
const mountain = [
  ['第一章 山风经过的地方', [
    '搬到山脚下的那一天，天气很好。木门推开时发出轻轻的一声响，像有人在句子结尾放了一个温柔的句号。院子里有一棵树，树下没有别的东西，只有午后的影子。',
    '我把带来的书放在窗边。窗外的山并不高，却足够挡住一些匆忙。远处有人烧水，白色的烟沿着屋檐慢慢升起，到了树梢，就散开了。那一刻我才发现，原来一个下午可以这么长。',
    '在城市里，我们总是等下一班车、下一个消息、下一个终于可以休息的周末。到了这里，等待成了一件不需要目的的事。等一壶水开，等一片云走过去，等夕阳从对面的山坡退下来。',
    '邻居是一位头发很白的老人。他每天早上都提着竹篮出门，有时候带回青菜，有时候带回几根还带着泥土的笋。有一次，我问他走了多远。他想了想，说：走到想回家的地方。',
    '我记下了这句话。它没有道理可讲，却让我想起许多年前，自己也曾这样走路。那时候不看步数，不赶时间，走到巷口闻见饭菜香，就知道该回去了。',
    '傍晚的山风穿过院子，翻动我摊开的书页。我没有急着把它按住。有些时候，让风替我们读上几行，也很好。',
    '夜色将近时，山一点一点变成墨色。屋檐下的小灯亮起来，照着一小片刚扫过的地面。我想，这大概就是生活合适的大小：不必照亮整座山，只要看得清回家的几步路。',
  ]],
  ['第二章 雨天的来信', [
    '雨从凌晨开始下。起初是零星的几滴，落在铁皮屋檐上，后来声音连成了一片，像一封写得很长的信，一直没有署名。',
    '我在早饭后把椅子搬到门边。雨中的院子比晴天更安静，并不是没有声音，而是每一种声音都有了自己的位置。水从叶尖落进旧陶盆，屋后的溪水绕过石头，一只不知名的鸟叫了两声。',
    '今天没有必须完成的事。书读到一半，就放下来，抬头看雨。杯子里的茶淡了，便添些热水。这样的日子很难写进日程表，却在记忆里留下了很深的颜色。',
    '中午，老人送来一碗刚煮好的面。他没有撑伞，帽檐上都是水珠。我请他坐一会儿，他说菜地里还有事，转身就走了。碗底压着两片青菜，面条热得让我眼镜起了雾。',
    '我们把许多关心说得很复杂，生怕词语不够漂亮。可真正让人记得的，常常只是一碗热面，一个替你关好的窗，一句快下雨了，早点回来。',
    '到了下午，雨停了一小会儿。我走到山路上，闻见湿润的泥土和草叶。水珠挂在蜘蛛网上，像一串谁也没有打算收走的珍珠。山从雾里露出一角，又很快藏了回去。',
    '回家时我收到朋友的消息。他问，在山里会不会觉得孤单。我拍了一张门前的照片发给他：一只湿漉漉的猫正坐在台阶上。它没有看我，仿佛已经在这里住了很久。',
  ]],
  ['第三章 把时间留给一棵树', [
    '春天来的时候，我并没有立刻发现。只是某天开窗，院子里的树突然多了一层浅绿色。我以为那是光，走近了才知道，是新叶。',
    '同一棵树，每天看，似乎没有变化。隔了一周再看，又像换了一个模样。我把这种发现告诉老人，他说，树一直在长，是我们常常没有看见。',
    '于是我开始每天花几分钟看它。叶子的背面比正面浅，枝条在风里有各自的方向，一处树皮的裂缝里竟然长出了一小团青苔。原来熟悉的东西，也藏着那么多陌生的部分。',
    '午后，我在树下读书。读到一句喜欢的话，停下来，不急着接着读。阳光穿过叶子，在纸上留下摇晃的圆斑，像这本书还没有写完的标点。',
    '我终于理解，所谓慢下来，并不是把每件事都做得更慢。而是不再把正在发生的生活，当作通往下一件事的过道。吃饭的时候吃饭，看树的时候看树，想念一个人的时候，就认真地想念。',
    '那天晚上，我给很久没有联系的朋友写了一封信。没有说什么重要的事，只告诉他山里的天气，树的新叶，还有那只总来院子的猫。写到最后，我说：有空来坐坐，椅子还有一把。',
  ]],
  ['第四章 在平常的一天里', [
    '离开山里的前一天，我没有去任何特别的地方。早起煮粥，扫院子，把借来的碗还回去，和老人说了几句天气。这是一个平常得不能再平常的日子。',
    '我曾经以为，值得记住的生活必须有壮阔的风景、遥远的地方，或者某种终于到来的答案。住下来才发现，生活大部分的美好，都藏在重复里。',
    '同一扇窗，同一段路，同一个人问你吃饭了没有。在重复中，我们逐渐辨认出细微的不同：今天的光更暖，路边多了一朵花，那个沉默的人终于朝你笑了一下。',
    '收拾行李时，书里掉出一片叶子。已经干了，边缘微微卷起。我想了很久，想不起是哪一天夹进去的。有些记忆不会留下日期，却会留下形状。',
    '下午，我把椅子放回窗边。窗台上的杯子洗好了，门口的鞋摆整齐了。没有什么需要郑重告别，因为我知道，山在那里，院子在那里，那一阵风也还会经过。',
    '如果你读到了这里，愿你也有这样一个小小的地方。它不一定在山里，也不一定很远。也许就是下班路上的一张长椅，家里一扇向着天空的窗，或者此刻，打开一本书的几分钟。',
    '生活很长，不必每一页都匆忙翻过。',
  ]],
];
const season = [
  ['第一章 春日有信', ['春天从一碗新鲜的青菜开始。菜场的摊主把最嫩的一把挑出来，递给我时说，今天刚摘的。那些叶子带着一点雨后的气味，像替整个季节做了一个简短的自我介绍。', '回家的路上，路边的玉兰开了。没有人提醒它，也不需要谁为它安排日程。到了合适的时候，它就开花，开得安静又认真。', '我想，我们也可以不那么着急。在一件小事上花一点时间，让春天从一个看得见的地方开始。']],
  ['第二章 夏夜很长', ['夏天的晚上，适合把灯调暗一点。风扇缓慢转着，窗外有人说话，冰箱里还有半个西瓜。一天里那些沉重的事情，到了这个时候，也轻了一些。', '小时候住的巷子，每到夏天都摆满竹椅。大人摇着扇子，小孩跑来跑去，没有什么新闻，也有说不完的话。', '后来我们有了更大的房子、更清凉的空调，却偶尔还会想起那条热闹的巷子。原来让人怀念的不是凉快，而是可以和谁一起，度过一个没有安排的晚上。']],
  ['第三章 秋天适合散步', ['天气凉下来的那天，我绕了一段远路回家。鞋底踩过落叶，发出轻微的脆响。路边的面包店开着门，温暖的香气一直飘到转角。', '秋天让人愿意走路。没有夏天那么急着躲进阴影，也没有冬天那么盼着快点进门。光是走在路上，就已经是很好的一件事。', '我买了一个还热着的面包，坐在河边慢慢吃完。天色一点点暗下来，对岸的灯一盏接一盏地亮起。']],
  ['第四章 冬天的一盏灯', ['冬天的幸福很具体。一双干燥的袜子，一碗热汤，窗帘拉上以后，房间里只属于自己的光。', '朋友寄来一条围巾，包裹里没有贺卡，只夹了一张便签：冷了就戴。简单的几个字，让整个冬天都有了温度。', '四季总会继续往前走。我们能做的，是在经过的时候，认真地接住一些微小的好意。把它们放在心里，等下一阵风来的时候，再拿出来取暖。']],
];
await writeFile(new URL('mountain.txt', root), mountain.map(([title, paras]) => `${title}\n\n${paras.join('\n\n')}`).join('\n\n\n'), 'utf8');
await writeFile(new URL('season.txt', root), season.map(([title, paras]) => `${title}\n\n${paras.join('\n\n')}`).join('\n\n\n'), 'utf8');
const moon = [
  ['第一章 窗台上的月光', ['晚上十点，我关掉厨房的灯。月光正好落在窗台上，照着一只白色的杯子。那杯子买了很多年，边缘已经有了一道小小的缺口，却一直没有舍得换。', '有些东西，陪伴得久了，就不再只是东西。那只杯子知道我熬过多少个深夜，也知道某一个早晨，我终于有心情在窗边坐下来，认真地喝完一杯水。', '我没有急着睡觉。窗外的城市慢慢安静下来，楼下还有人牵着狗散步。一天走到这里，仿佛终于回到了自己的手里。']],
  ['第二章 一间有光的屋子', ['搬进新住处时，房间里只有一张桌子。我把桌子挪到窗前，放上一盏灯、几本书，还有一束在路边买的花。屋子就这样有了属于我的部分。', '我们并不需要一间很大的屋子，才能安放生活。有时只需要一个角落，能够让你坐下来，不用立刻成为谁期待的样子。', '周末下雨，我在屋里整理旧照片。照片上的人比现在年轻，穿着已经想不起放在哪里的衣服，笑得很用力。我把照片重新放回盒子里，觉得那时候的自己，也很值得被好好对待。']],
  ['第三章 好好度过今天', ['我开始学习不把今天当作明天的准备。不再等到一切都安排妥当，才允许自己休息。刚洗好的床单、午后的一杯茶、读到一半的故事，都值得现在就喜欢。', '月亮又升起来了。窗台上那只杯子还在，旁边多了一盆新长出叶子的薄荷。风吹过来时，叶子轻轻动了一下。', '生活没有给出什么了不起的答案。可这个晚上，我觉得自己已经拥有了足够多的东西。']],
];
const island = [
  ['第一章 开往小岛的船', ['船离开码头的时候，岸上的声音一下子远了。白色的浪从船尾展开，像一条慢慢写下的路。我站在甲板上，直到熟悉的城市缩成一条细线。', '这是一场没有详细计划的旅行。行李很少，书带了一本，目的地是一座需要坐两个小时船才能抵达的小岛。朋友问我去那里做什么，我说，看看海。', '有些出发，不是为了遇见什么特别的事。只是想换一种光线，看一看自己。']],
  ['第二章 岛上的下午', ['岛上的路很窄，沿着海岸弯弯绕绕。卖鱼的铺子只开半天，便利店门口坐着一只很胖的猫。风里有盐的气味，也有晒热的石头的气味。', '我找到一家小咖啡馆。老板没有问我从哪里来，只问喝热的还是冰的。我选了靠窗的位置，窗外是一片安静的蓝。', '杯子空了以后，我还在那里坐了很久。没有人催促，也没有什么错过了会可惜的行程。那个下午，时间好像不是用来花掉的，而是用来待着的。']],
  ['第三章 回程也是远方', ['回去的船在傍晚开。夕阳把海面照成一种很难命名的颜色。我翻开带来的书，发现一路上只读了二十几页。', '旅行有时候就是这样。没有完成很多事，也没有带回多少纪念品，却觉得心里某个挤得很满的地方，终于空出了一点。', '岸上的灯渐渐近了。我收起书，想起家里窗台上那盆需要浇水的植物。原来远行最好的部分，也包括忽然想回家。']],
];
function xml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
async function makeEpub(name, title, chapters) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="id" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:qidu:${name}</dc:identifier><dc:title>${title}</dc:title><dc:creator>栖读编辑室</dc:creator><dc:language>zh-CN</dc:language><meta property="dcterms:modified">2026-11-17T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${chapters.map((_, i) => `<item id="c${i}" href="chapter${i}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${chapters.map((_, i) => `<itemref idref="c${i}"/>`).join('')}</spine></package>`);
  zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>目录</title></head><body><nav epub:type="toc"><h1>目录</h1><ol>${chapters.map(([t], i) => `<li><a href="chapter${i}.xhtml">${xml(t)}</a></li>`).join('')}</ol></nav></body></html>`);
  for (const [i, [t, paragraphs]] of chapters.entries()) zip.file(`OEBPS/chapter${i}.xhtml`, `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${xml(t)}</title><meta charset="utf-8"/></head><body><h1>${xml(t)}</h1>${paragraphs.map(p => `<p>${xml(p)}</p>`).join('')}</body></html>`);
  await writeFile(new URL(`${name}.epub`, root), await zip.generateAsync({type:'nodebuffer', compression:'DEFLATE'}));
}
await makeEpub('moon', '月亮与窗台', moon);
await makeEpub('island', '岛屿的另一边', island);
function makePdf(pages) {
  const objects = [null, '<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>'];
  const pageRefs = [];
  for (const [i, page] of pages.entries()) {
    const pageId = objects.length;
    const contentId = pageId + 1;
    pageRefs.push(`${pageId} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    const esc = s => s.replace(/[\\()]/g, '\\$&');
    const stream = `q 0.973 0.961 0.929 rg 0 0 595 842 re f Q\nq 0.22 0.35 0.30 rg 54 740 36 3 re f Q\nBT /F1 10 Tf 0.4 0.43 0.4 rg 54 765 Td (QIDU STUDIO   /   A READING SAMPLE) Tj ET\nBT /F2 35 Tf 0.16 0.23 0.2 rg 54 662 Td (${esc(page[0])}) Tj ET\n${page[1].map((line, j) => `BT /F1 13 Tf 0.29 0.33 0.30 rg 54 ${590 - j * 29} Td (${esc(line)}) Tj ET`).join('\n')}\nq 0.78 0.58 0.43 RG 1 w 54 180 m 540 180 l S Q\nBT /F1 10 Tf 0.45 0.46 0.42 rg 54 145 Td (An original PDF sample. Import your own books to make this space yours.) Tj ET\nBT /F1 10 Tf 500 55 Td (0${i + 1} / 0${pages.length}) Tj ET`;
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`;
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (let i = 1; i < objects.length; i++) { offsets[i] = Buffer.byteLength(pdf); pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}
await writeFile(new URL('slow.pdf', root), makePdf([
  ['The art of slowing down', ['Walk a little further. Look a little closer.', '', 'Not every hour needs a destination.', 'Some afternoons are meant for an open window,', 'a cup of tea, and a story you do not want to end.', '', 'This is a small invitation to pay attention.']],
  ['A field guide to noticing', ['01    Find a street you have never walked down.', '02    Watch the light move across a quiet room.', '03    Read one page without checking the time.', '04    Leave room for an unexpected conversation.', '05    Let an ordinary day be enough.']],
  ['Take the long way home', ['There is no perfect pace for a life.', 'There is only the rhythm that lets you notice it.', '', 'Keep the book. Fold the corner of a memory.', 'Come back whenever you need a little quiet.', '', 'Your next chapter can begin right here.']],
]));
await writeFile(new URL('space.pdf', root), makePdf([
  ['Leave a little space', ['A note on simplicity, attention, and everyday life.', '', 'A room does not become a home when it is full.', 'It becomes a home when there is room for you.', '', 'Make space for the things that matter.']],
  ['Less, but a little better', ['One good chair by the window.', 'One book that makes you feel less alone.', 'One slow morning without a list.', '', 'Enough can be a beautiful place to begin.']],
  ['A quiet ending', ['Close the book when you are ready.', 'The world will still be waiting.', '', 'QIDU STUDIO / ORIGINAL SAMPLE / 2026']],
]));
console.log('Created six original TXT, EPUB and PDF reading samples.');
