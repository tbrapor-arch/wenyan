"""Mandarin text -> tappable words, each with its pinyin (chosen for the sentence) and CC-CEDICT senses: the
dictionary of every Chinese text the Wenyan app shows (app/src/dict.js: zhCut / zhLine / zhLineClassical and the
dictionary sheet). Automatic: neither the cut nor the readings are checked by a person.

A port of Tsheh-tû's tools/zh_words.py (itself the Shūjià reader's model, built at build time): same cut, same reading
rules, same integer scores, same table format, so a fix there ports here line by line. What differs is listed under
"Wenyan" at the end of this docstring.

The cut (the Shūjià reader's model, jieba-style)
  * In each run of Han characters, the cut with the highest total score, a word scoring round(1000 · ln f) minus
    QT = round(1000 · ln total): f is its frequency in jieba's dictionary (data/raw/jieba/dict.txt, simplified, MIT).
    Words up to 8 characters; equal totals keep the longer first word.
  * Traditional / Taiwan text: a written word is looked up under every simplified form its characters can have
    (CC-CEDICT's traditional/simplified pairs + VARIANT_FORMS: 裏 裡, 著 着, 份 分, 臺 台…), the best one counts; the
    cut stays on the written characters. 過份 finds 过分, 看著 看着. Simplified text is looked up as written.
  * A CC-CEDICT word jieba's dictionary lacks (过多, 太过: jieba finds those with its HMM, which is not used here)
    gets the frequency its weight in jieba's idf.txt (same repository, MIT) stands for, mapped onto the dictionary's
    scale by a least-squares line over the words both files have; a word in neither file gets f = 20 (one character)
    or 3, as in Shūjià. Any other single character f = 1.
  * Only CC-CEDICT words count as words of two or more characters: a jieba word CC-CEDICT lacks (很快, 件事, 可用) is
    cut into CC-CEDICT words, so every tap opens a real CC-CEDICT entry. Measured in Tsheh-tû on 6,000 texts, letting
    those words in (and showing them as their parts, as Shūjià does) changed 70 cuts, mostly for the worse.
  * Integer scores: the browser repeats the exact same cut from the table (zhCut in app/src/dict.js).

The readings (numbered pinyin, CC-CEDICT's, mainland standard; 一 and 不 in their citation tones, as dictionaries write)
  * Each word has a default reading, a pure function of the word: SINGLE (particles and a few characters), WORD_PY
    (word overrides), else for one character the reading used by the most frequent words (CC-CEDICT × jieba, as
    Shūjià's READ_MAIN), for a longer word its HSK reading, else pypinyin's reading of the word (phrase dictionary),
    else the CC-CEDICT reading with most senses; "used in / variant / archaic" readings and names last.
  * Per occurrence: a single character standing as a word gets the reading `rule()` gives from the words around it in
    the computed cut (V得 de, 我得 děi, 睡不著 zháo, 委婉地 de, 長出 zhǎng, 還錢 huán, 為了 / 為他 / 為…而 wèi but
    以…為 wéi, 數一數 shǔ…), kept only if CC-CEDICT lists it for that character. A longer word keeps its default
    (pypinyin's phrase dictionary reads a word, not a sentence), except 多少 (數量的多少 duōshǎo).
  * Where an occurrence's reading differs from its word's default, the run of Han characters gets an exception
    {key(run): "token.line,…"} (the word's position among the run's tappable words, the line of its entry).

Shipped in the course data (DATA = app/course.json, inlined in the page): one table {word: entry} (`zh`), the
exceptions (`zhx`), the constant QT (`zhqt`), and two Wenyan additions: `zhm` {word: "i n4 h3 o發/髮"} (成語 flag,
NHSK level, HSK level, the other script's form) and `zhp` {word: "part part"} (a course word CC-CEDICT lacks, shown
as its parts, Shūjià's compoundEntry). No per-text cut. Entry:
  "score|pinyin<TAB>senses" lines, the default reading first, the senses joined with "/" as in CC-CEDICT itself (so
  the sheet numbers them; classifiers stay in as "CL:…" senses); empty for a character CC-CEDICT lacks (kept for its
  score); "score|=点" when the lines are those of an earlier word of the table (點 = 点: one copy, -20 %). `check()` runs the browser's rule here.

    import zh_words
    L = zh_words.Lexicon()
    for t in modern_texts: L.add(t)
    for t in classical_texts: L.add(t, classical=True)
    for w in course_words: L.add_word(w)
    DATA['zh'], DATA['zhx'], DATA['zhqt'] = L.table(), L.exceptions(), zh_words.model().QT
    DATA['zhm'], DATA['zhp'] = L.meta(), L.parts()
    zh_words.check(texts, DATA['zh'], DATA['zhx'], classical)   # -> texts the browser would show differently (0)

Wenyan (what differs from Tsheh-tû's file, and why)
  * Simplified text too (入門 is written in simplified; every text also ships in the other script): a simplified word
    gathers the entries of every traditional headword with that simplified form (发 = 發 fā + 髮 fà); the reading
    rules, SINGLE and WORD_PY (written in traditional) see the traditional form of the words (OpenCC s2tw, word by
    word); HSK readings and the most-used reading of a character are indexed under both scripts.
  * Exceptions are keyed by the run of Han characters, not by the whole text: the cut and the rules never look past
    punctuation, and the app's renderer may pass a whole note, a sentence or a fragment of it to zhLine.
  * The table holds, besides the words of the cut, every character of the texts and every CC-CEDICT word of 2–8
    characters found anywhere in them ("Other cuts" in the sheet, Shūjià's "Autres découpages", and the characters
    of a word, each tappable). Adding words with the model's own scores cannot change the cut: the build's cut already
    weighed them. Classical text (文言 lines, 文言 exercises, classical origins and "Roots") is never cut into words
    (`classical=True`): its characters and words go into the table, its readings are the defaults.
  * Senses joined with "/" (not "; ") and classifiers kept: the sheet numbers the senses and shows a classifier line.
  * "score|=word": an entry whose lines are those of an earlier word (both scripts of most words have the same lines).
  * `zhm` (成語 flag: CC-CEDICT "(idiom" or jieba's part of speech i; NHSK from data/nhsk.tsv; HSK 2012 from
    complete-hsk-vocabulary) and `zhp` (parts of a course word CC-CEDICT lacks, cut by the same rule).

Data: data/raw/cedict (CC-CEDICT, CC BY-SA 4.0, MDBG), data/raw/jieba (dict.txt, idf.txt; MIT),
data/raw/complete-hsk-vocabulary (MIT), all fetched by `make data`; data/nhsk.tsv (CC BY-SA 4.0). pypinyin and opencc
(requirements.txt).
"""
import itertools
import json
import math
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CEDICT = os.environ.get('CEDICT') or os.path.join(ROOT, 'data/raw/cedict/package/cedict.json')
JIEBA = os.path.join(ROOT, 'data/raw/jieba/dict.txt')
IDF = os.path.join(ROOT, 'data/raw/jieba/idf.txt')
HSK = os.path.join(ROOT, 'data/raw/complete-hsk-vocabulary/complete.min.json')
NHSK = os.path.join(ROOT, 'data/nhsk.tsv')
RAW = [CEDICT, JIEBA, IDF, HSK]
HAN_CLASS = '㐀-鿿豈-﫿\U00020000-\U0003134f'   # same class as ZH_RUN in the app
HAN = re.compile(f'[{HAN_CLASS}]')
RUN = re.compile(f'([{HAN_CLASS}]+)')
MAXN = 8          # longest word looked up
SCALE = 1000      # scores are round(SCALE · ln f)
SENSES = 6        # readings kept per word
CL = ('CL:',)     # CC-CEDICT classifier items: kept in the table (the sheet's classifier line), not counted as senses
SEP = '/'         # senses joined as in CC-CEDICT (no sense contains a '/'): the sheet numbers them
MINOR = re.compile(r'archaic|obsolete|^old variant of|^variant of|^used in |radical|^see |Japanese variant|\(old\)|'
                   r'^\(dialect\)|^\(Cantonese\)|^surname |^\(Tw\)', re.I)
# Taiwan / old variant characters -> the forms CC-CEDICT and jieba use (besides CC-CEDICT's own pairs)
VARIANT_FORMS = {'裏': '裡里', '峯': '峰', '牀': '床', '綫': '線线', '麪': '麵面', '衆': '眾众', '爲': '為为', '僞': '偽伪',
                 '眞': '真', '敎': '教', '値': '值', '着': '著着', '著': '着著', '啓': '啟启', '敍': '敘叙', '溼': '濕湿',
                 '箇': '個个', '纔': '才', '粧': '妝妆', '菸': '煙烟', '綑': '捆', '份': '份分', '臺': '台', '台': '臺台',
                 '佈': '布', '做': '做作', '祕': '秘', '汙': '污', '恆': '恒', '吋': '寸', '踴': '踊', '撐': '撑', '囉': '啰', '喫': '吃'}
# a single character standing as a word: its default reading (rule() may change it per occurrence)
SINGLE = {'著': 'zhe5', '着': 'zhe5', '得': 'de5', '地': 'di4', '了': 'le5', '嗎': 'ma5', '呢': 'ne5', '吧': 'ba5',
          '個': 'ge4', '麼': 'me5', '的': 'de5', '一': 'yi1', '不': 'bu4', '都': 'dou1', '還': 'hai2', '為': 'wei2',
          '和': 'he2', '只': 'zhi3', '要': 'yao4', '長': 'chang2', '重': 'zhong4', '行': 'xing2', '會': 'hui4',
          '便': 'bian4', '當': 'dang1', '種': 'zhong3', '數': 'shu4', '好': 'hao3', '倒': 'dao4', '樂': 'le4',
          '發': 'fa1', '乾': 'gan1', '幹': 'gan4', '少': 'shao3', '中': 'zhong1', '大': 'da4', '分': 'fen1',
          '相': 'xiang1', '看': 'kan4', '說': 'shuo1', '傳': 'chuan2', '藏': 'cang2', '應': 'ying1', '切': 'qie1',
          '與': 'yu3', '載': 'zai4', '盛': 'sheng4', '處': 'chu4', '調': 'diao4', '差': 'cha4', '空': 'kong1',
          '量': 'liang4', '正': 'zheng4', '將': 'jiang1', '朝': 'chao2', '教': 'jiao1', '覺': 'jue2', '省': 'sheng3',
          '背': 'bei4', '血': 'xue4', '薄': 'bao2', '給': 'gei3', '似': 'si4', '露': 'lu4', '假': 'jia3', '答': 'da2',
          '結': 'jie2', '曾': 'ceng2', '沒': 'mei2', '把': 'ba3', '上': 'shang4', '參': 'can1', '興': 'xing4',
          '降': 'jiang4', '供': 'gong1', '扇': 'shan4', '熟': 'shu2', '削': 'xiao1', '塞': 'sai1', '縫': 'feng2',
          '轉': 'zhuan3', '散': 'san4', '難': 'nan2', '間': 'jian1', '奇': 'qi2', '晃': 'huang4', '彈': 'tan2',
          '模': 'mo2', '冲': 'chong1', '衝': 'chong1', '佔': 'zhan4', '占': 'zhan4', '咽': 'yan4', '吐': 'tu3',
          '畜': 'chu4', '卡': 'ka3', '鑽': 'zuan1', '釘': 'ding1', '擔': 'dan1', '劃': 'hua4', '扎': 'zha1', '號': 'hao4',
          '漂': 'piao1', '佛': 'fo2', '兒': 'er2', '冠': 'guan1', '那': 'na4', '哪': 'na3', '啊': 'a5', '呀': 'ya5', '喔': 'o5',
          '哦': 'o4', '嘛': 'ma5', '啦': 'la5', '喲': 'yo5', '亡': 'wang2', '仔': 'zai3'}
# word readings CC-CEDICT gives in another order, or several, where one is far more usual
WORD_PY = {'地方': 'di4 fang5', '生意': 'sheng1 yi5', '教授': 'jiao4 shou4', '所長': 'suo3 zhang3', '到了': 'dao4 le5',
           '都會': 'dou1 hui4', '不了': 'bu4 liao3', '起來': 'qi3 lai5', '東西': 'dong1 xi5', '便宜': 'pian2 yi5',
           '大夫': 'dai4 fu5', '妻子': 'qi1 zi5', '結果': 'jie2 guo3', '得到': 'de2 dao4', '了解': 'liao3 jie3',
           '拜拜': 'bai4 bai5', '覺得': 'jue2 de5', '記得': 'ji4 de5', '曉得': 'xiao3 de5', '值得': 'zhi2 de5',
           '捨得': 'she3 de5', '倒是': 'dao4 shi5', '一會兒': 'yi1 hui4 r5', '這個': 'zhe4 ge5', '那個': 'na4 ge5',
           '一個': 'yi1 ge4', '什麼': 'shen2 me5', '怎麼': 'zen3 me5', '多少': 'duo1 shao5', '意思': 'yi4 si5',
           '時候': 'shi2 hou5', '漂亮': 'piao4 liang5', '朋友': 'peng2 you5', '出來': 'chu1 lai5', '下來': 'xia4 lai5',
           '上來': 'shang4 lai5', '過來': 'guo4 lai5', '回來': 'hui2 lai5', '進來': 'jin4 lai5', '出去': 'chu1 qu5',
           '下去': 'xia4 qu5', '上去': 'shang4 qu5', '過去': 'guo4 qu4', '人家': 'ren2 jia1', '大意': 'da4 yi4',
           '地道': 'di4 dao5', '兄弟': 'xiong1 di4', '運氣': 'yun4 qi5', '本事': 'ben3 shi5', '大方': 'da4 fang5',
           '多數': 'duo1 shu4', '少數': 'shao3 shu4', '重複': 'chong2 fu4', '重量': 'zhong4 liang4', '長大': 'zhang3 da4'}
PRON = set('我你他她它您咱們们誰谁人家')
NUM = set('一二三四五六七八九十兩百千萬幾半每這那哪某各此數')
_M = None


def marks(numbered):
    """CC-CEDICT 'zhong1 guo2' -> 'zhōng guó'"""
    tones = {'a': 'āáǎàa', 'e': 'ēéěèe', 'i': 'īíǐìi', 'o': 'ōóǒòo', 'u': 'ūúǔùu', 'ü': 'ǖǘǚǜü'}
    out = []
    for syl in numbered.split():
        m = re.fullmatch(r'([A-Za-zü:]+)([1-5])', syl.replace('u:', 'ü').replace('U:', 'Ü'))
        if not m:
            out.append(syl)
            continue
        b, t = m.group(1), int(m.group(2)) - 1
        low = b.lower()
        i = low.find('a') if 'a' in low else low.find('e') if 'e' in low else low.find('ou') if 'ou' in low \
            else max(low.rfind(v) for v in 'iouü')
        if i < 0:
            out.append(b)
            continue
        mk = tones[low[i]][t]
        out.append(b[:i] + (mk.upper() if b[i].isupper() else mk) + b[i + 1:])
    return ' '.join(out)


def norm_num(p):
    """numbered pinyin, compared form: lower case, ü as v, neutral tone 5"""
    out = []
    for s in p.lower().replace('u:', 'v').replace('ü', 'v').split():
        out.append(s if s[-1:].isdigit() else s + '5')
    return ' '.join(out)


WHO = {'他人', '別人', '大家', '自己', '死人', '活人', '國家', '民眾', '社會', '某人', '子女', '父母', '孩子',
       '他', '她', '我', '你', '您', '誰', '人民', '眾人', '對方', '朋友', '客人', '家人', '神明', '祖先'}


def rule(c, words, j):
    """the reading of a single character standing as word j of a run of Han characters (the run's words: the edge
    of a run is punctuation), or None: the default. Numbered pinyin."""
    prev = words[j - 1] if j else ''
    nxt = words[j + 1] if j + 1 < len(words) else ''
    p1, n1 = prev[-1:], nxt[:1]
    if c == '多少':   # 數量的多少: amount
        return 'duo1 shao3' if prev == '的' or nxt in ('不', '有', '而') else None
    if c == '得':
        if n1 == '了' and (not prev or p1 in PRON or prev in ('就', '都', '也', '又', '還', '已', '曾', '已經', '終於', '才')):
            return 'de2'                           # 他得了第一名: obtained (V得了 stays de)
        if p1 and p1 in PRON and n1 and n1 not in '到了出以知益失分獎勝':
            return 'dei3'                          # 我得走, 你們得去: must
        if prev in ('就', '還', '也', '都', '總', '非', '可') and n1 and n1 not in '到了出以知益失分':
            return 'dei3'
        if not prev and nxt in ('要', '先', '把', '趕快', '馬上', '去', '來', '好好', '注意', '小心', '再', '趕緊', '靠'):
            return 'dei3'                          # (，)得要, 得先: must
        if not prev or prev in ('而', '所', '可', '獲', '取', '求', '心', '難', '各', '自', '應', '不可', '必'):
            return 'de2'                           # 得之, 所得, 各得其所: obtain
        return None                                # V得 / A得: de
    if c in '著着':
        if p1 in ('不', '得', '沒') or prev in ('找', '睡', '猜', '摸', '夠', '用', '見'):
            return 'zhao2'                         # 睡不著, 找著, 用不著: reach / succeed
        if not prev and n1:
            return 'zhuo2' if n1 and n1 in '手重眼力落陸裝想' else 'zhao2'   # 著重, 著急 (words); 著火, 著涼
        if n1 and n1 in '火涼迷急慌':
            return 'zhao2'
        return None
    if c == '了':
        if prev in ('不', '得') and (not nxt or n1 == '的'):
            return 'liao3'                         # V不了, V得了: be able to
        return None
    if c == '地':
        if len(prev) >= 2 and (nxt or prev[-1] == prev[-2]):
            return 'de5'                           # 委婉地 + verb, 慢慢地: -ly
        return None
    if c == '還':
        if n1 and n1 in '錢債給清本原手擊鄉俗願' or prev in ('歸', '償', '退', '交', '送', '借', '討', '要', '把'):
            return 'huan2'
        return None
    if c == '長':
        if prev in ('太', '很', '好', '真', '較', '比較', '更', '最', '多', '那麼', '這麼', '夠', '又', '不', '細', '特別', '非常'):
            return None                            # 太長了, 很長: long
        if n1 and (n1 and n1 in '得大出滿成高胖肉毛葉芽牙鬍鬚瘡蟲' or nxt in ('了', '著', '在')):
            return 'zhang3'                        # 長得, 長出, 長滿: grow
        if prev in ('生', '成', '增', '助', '滋', '瘋', '又', '再', '也', '會', '已', '正在', '開始') and n1 != '的':
            return 'zhang3'
        return None
    if c == '為':
        before = words[:j]
        if any(w in ('以', '被', '視', '作', '當', '選', '列', '奉', '尊', '認', '稱', '改', '分', '化', '變', '成') for w in before) \
                or prev in ('多', '均', '皆', '都', '乃', '即', '亦', '實', '是', '則', '大', '最', '共', '合', '名', '多半') \
                or '所' in words[j + 1:j + 4]:
            return None                            # 以…為…, 多為, 為…所 (passive): be, as (wéi)
        if n1 and n1 in '了何什甚此某' or nxt in WHO or ''.join(words[j + 1:j + 3]) in WHO or ('而' in words[j + 2:j + 5] and (not prev or prev in ('是', '就', '也', '專', '只', '特', '正', '不'))):
            return 'wei4'                          # 為了, 為何, 為他, 為死人做…, 為獎勵而…: for
        return None
    if c == '重':
        if n1 and n1 in '做寫來讀考說打畫裝新蓋建修編排播申返回演選印':
            return 'chong2'                        # 重做, 重寫: again
        return None
    if c == '行':
        if p1 and p1 in NUM or prev in ('同', '這', '那', '哪', '本', '外', '內', '銀', '改'):
            return 'hang2'                         # 一行, 兩行, 這行: row / trade
        return None
    if c == '種':
        if n1 and n1 in '樹花菜豆稻瓜果草苗田地麥菸' and not (p1 and p1 in NUM):
            return 'zhong4'                        # 種樹, 種花: plant
        return None
    if c == '數':
        if (prev == '數' or nxt in ('一', '數', '錢', '不', '著', '到', '過', '了', '清', '得')) and not (p1 and p1 in NUM):
            return 'shu3'                          # 數一數, 數錢: count
        return None
    if c == '倒':
        if prev in ('推', '撞', '摔', '跌', '絆', '滑', '打', '翻', '碰', '壓', '砍', '放', '病', '累', '醉', '嚇', '昏',
                    '踢', '吹', '颳', '拉', '扳', '弄', '震', '傾', '撲') or n1 and n1 in '下塌閉地臺台':
            return 'dao3'                          # 推倒, 倒下: fall
        return None
    if c == '處':
        if n1 and n1 in '在於理置罰事世':
            return 'chu3'                          # 處在, 處於: be in; 處理
        return None
    if c == '量':
        if n1 and n1 in '體身尺血' or nxt in ('一下', '一量', '量'):
            return 'liang2'                        # 量體重: measure
        return None
    if c == '背':
        if n1 and n1 in '著包書孩小起走' or nxt in ('著', '起來'):
            return 'bei1'                          # 背著, 背書包: carry on the back
        return None
    if c == '盛':
        if n1 and n1 in '飯湯水菜粥酒滿物器':
            return 'cheng2'                        # 盛飯: fill
        return None
    if c == '好':
        if prev in ('愛', '喜', '所', '嗜', '偏', '最') or nxt in ('學', '吃', '色', '奇', '客', '動', '強', '勝', '辯'):
            return None if nxt == '吃' else 'hao4'
        return None
    if c == '教':
        if n1 and n1 in '育室堂師授條會徒派':
            return 'jiao4'
        return None
    if c == '當':
        if n1 and n1 in '作成做真':
            return 'dang4'                         # 當作, 當真: take as
        return None
    if c == '空':
        if n1 and n1 in '出下閒地位隙' or p1 in ('有', '沒', '抽', '得'):
            return 'kong4'                         # 空出, 有空: free (time / space)
        return None
    if c == '差':
        if n1 and n1 in '別異距額價錯':
            return 'cha1'                          # 差別, 差距: difference
        return None
    if c == '調':
        if n1 and n1 in '整和節皮配解劑味':
            return 'tiao2'                         # 調整, 調味: adjust
        return None
    if c == '應':
        if n1 and n1 in '對付用聘徵邀變急':
            return 'ying4'                         # 應付, 應邀: respond
        return None
    if c == '相':
        if n1 and n1 in '片貌機館聲' or prev in ('照', '長', '真', '首', '宰', '外', '丞', '面'):
            return 'xiang4'                        # 相片, 照相: appearance
        return None
    if c == '藏':
        if n1 and n1 in '民族獒語文區人醫藥袍戲曆經傳':
            return 'zang4'                         # 藏民: Tibet (Shūjià's CTX_READ)
        return None
    if c == '間':
        if n1 and n1 in '隔斷接諜歇':
            return 'jian4'
        return None
    if c == '興':
        if n1 and n1 in '起建旺盛奮':
            return 'xing1'
        return None
    if c == '難':
        if n1 and n1 in '民友胞':
            return 'nan4'
        return None
    if c == '覺':
        if prev in ('睡', '午', '一'):
            return 'jiao4'
        return None
    if c == '降':
        if n1 and n1 in '服伏':
            return 'xiang2'
        return None
    if c == '散':
        if n1 and n1 in '文裝漫' or prev in ('懶', '鬆'):
            return 'san3'
        return None
    if c == '彈':
        if n1 and n1 in '藥頭殼丸珠':
            return 'dan4'
        return None
    if c == '塞':
        if n1 and n1 in '外北翁':
            return 'sai4'
        return None
    if c == '傳':
        if n1 and n1 in '記略' or prev in ('自', '列', '外', '正', '經', '水滸'):
            return 'zhuan4'
        return None
    if c == '便':
        if n1 and n1 in '宜':
            return 'pian2'
        return None
    if c == '薄':
        if n1 and n1 in '弱情命荷利' or prev in ('淺', '單', '刻', '微', '稀'):
            return 'bo2'
        return None
    return None


class Model:
    def __init__(self):
        self.ced, self.simp = {}, {}            # trad -> [[numbered, [English…]]…]; simp -> [trad…]
        self.freq, self.total, self.idf = {}, 1, {}
        self.t2s = {}                           # trad char -> [simplified forms, most usual first]
        self.hsk = {}                           # word (both scripts) -> HSK numbered reading
        self.hsk_lv, self.nhsk_lv = {}, {}      # word (both scripts) -> HSK (2012) level 1-6 / NHSK level "1".."7-9"
        self.s_of = {}                          # trad headword -> its simplified forms (CC-CEDICT)
        self.ced_s = {}                         # trad headword -> the simplified form of each of its entries
        self.idiom = set()                      # jieba's part of speech i (idiom)
        if os.path.exists(CEDICT):
            rows = json.load(open(CEDICT, encoding='utf-8')) if CEDICT.endswith('.json') else []
            pair = {}
            for e in rows:
                t, s, p, en = e['traditional'], e['simplified'], e['pinyin'], e['english']
                if not t or not all(HAN.match(c) for c in t) or len(t) > MAXN:
                    continue
                self.ced.setdefault(t, []).append([p, list(en)])
                self.ced_s.setdefault(t, []).append(s)
                if t not in self.simp.setdefault(s, []):
                    self.simp[s].append(t)
                if s not in self.s_of.setdefault(t, []):
                    self.s_of[t].append(s)
                if len(t) == len(s):
                    for a, b in zip(t, s):
                        pair.setdefault(a, {}).setdefault(b, 0)
                        pair[a][b] += 1
            simps = {b for v in pair.values() for b in v}
            for a, v in pair.items():
                opts = sorted(v, key=lambda b: (-v[b], b != a))
                if a in simps and a not in opts:
                    opts.append(a)
                self.t2s[a] = opts[:3]
        for a, fs in VARIANT_FORMS.items():
            opts = []
            for f in fs:
                opts += [f] + self.t2s.get(f, [])
            self.t2s[a] = list(dict.fromkeys(opts + self.t2s.get(a, [])))[:4]
        if os.path.exists(JIEBA):
            tot = 0
            for line in open(JIEBA, encoding='utf-8'):
                x = line.split()
                if len(x) >= 2 and not line.startswith('#'):
                    self.freq[x[0]] = int(x[1])
                    tot += int(x[1])
                    if len(x) > 2 and x[2] == 'i':
                        self.idiom.add(x[0])
            self.total = max(tot, 1)
        else:
            print('zh_words: no jieba dictionary at', JIEBA, '(make data): words are cut by CC-CEDICT alone')
        if os.path.exists(IDF):
            # idf -> frequency on the dictionary's scale: ln f = a + b · idf, least squares over the words of two or
            # more characters both files have; used only for CC-CEDICT words the dictionary lacks
            idf = {}
            for line in open(IDF, encoding='utf-8'):
                x = line.split()
                if len(x) == 2:
                    idf[x[0]] = float(x[1])
            xs = [(v, math.log(self.freq[w])) for w, v in idf.items() if len(w) > 1 and self.freq.get(w)]
            if len(xs) > 100:
                n = len(xs)
                mx, my = sum(a for a, _ in xs) / n, sum(b for _, b in xs) / n
                b = sum((a - mx) * (c - my) for a, c in xs) / sum((a - mx) ** 2 for a, _ in xs)
                a = my - b * mx
                self.idf = {w: max(3, round(math.exp(a + b * v))) for w, v in idf.items()
                            if len(w) > 1 and w not in self.freq}
        if os.path.exists(HSK):
            for e in json.load(open(HSK, encoding='utf-8')):
                old = [int(x[1:]) for x in e.get('l', []) if x[:1] == 'o' and x[1:].isdigit()]
                for f in e['f']:
                    self.hsk.setdefault(f['t'], f['i']['n'])
                    self.hsk.setdefault(e['s'], f['i']['n'])
                    if old:
                        self.hsk_lv.setdefault(f['t'], min(old))
                if old:
                    self.hsk_lv.setdefault(e['s'], min(old))
        if os.path.exists(NHSK):
            for line in open(NHSK, encoding='utf-8'):
                x = line.rstrip('\n').split('\t')
                if len(x) >= 4 and not line.startswith('#') and x[0] != 's':
                    self.nhsk_lv.setdefault(x[0], x[3])
                    self.nhsk_lv.setdefault(x[1], x[3])
        self._s2t = None
        self.QT = round(SCALE * math.log(self.total))
        self._score, self._entry, self._main, self._rd, self._parts, self._canon = {}, {}, None, {}, {}, {}
        try:
            from pypinyin import lazy_pinyin, Style
            self.py = lambda s: lazy_pinyin([s], style=Style.TONE3, neutral_tone_with_five=True, errors=lambda x: list(x))
        except ImportError:
            self.py = None

    def canon(self, w):
        """the traditional form of a written word, for the rules, SINGLE and WORD_PY (written in traditional): OpenCC
        s2tw word by word (Taiwan forms, as the rules; a traditional word stays as it is); without OpenCC, CC-CEDICT's first traditional form"""
        r = self._canon.get(w)
        if r is None:
            if self._s2t is None:
                try:
                    from opencc import OpenCC
                    self._s2t = OpenCC('s2tw').convert
                except ImportError:
                    self._s2t = False
            r = self._s2t(w) if self._s2t else ''
            if len(r) != len(w):
                r = w if w in self.ced else (self.simp.get(w) or [w])[0]
            self._canon[w] = r
        return r

    # ---- the cut
    def forms(self, w):
        """simplified forms a written word can have (its characters' forms combined), the written form first"""
        opts = [[c] + [x for x in self.t2s.get(c, []) if x != c] for c in w]
        return [''.join(combo) for combo in itertools.islice(itertools.product(*opts), 64)]

    def score(self, w):
        """(score, simplified form) of a written word, or None when it is no word (longer than one character)"""
        r = self._score.get(w)
        if r is None:
            fs = self.forms(w)
            f, sw = max(((self.freq.get(x, 0), x) for x in fs), key=lambda y: y[0])
            ck = self.cedict_key(w)
            if not ck and len(w) > 1:
                f = 0                          # a word is a word the sheet can show: CC-CEDICT's
            elif not f:
                if ck and len(w) > 1:
                    f, sw = max(((self.idf.get(x, 0), x) for x in fs), key=lambda y: y[0])
                    f = f or 3
                elif ck:
                    f = 20
                else:
                    f = 1                      # a single character CC-CEDICT lacks: plain text
            if not f:
                r = False
            else:
                if not self.freq.get(sw) and not self.idf.get(sw):
                    sw = next((x for x in fs if x in self.simp), fs[-1])
                r = (round(SCALE * math.log(f)), sw)
            self._score[w] = r
        return r or None

    def cut_run(self, cs, known=None):
        """one run of Han characters (list of characters) -> list of words: highest total score, longer first word on
        a tie. known(w) -> score or None. The browser's zhCut() is the same."""
        known = known or (lambda w: (self.score(w) or (None,))[0])
        n = len(cs)
        best, step = [0] * (n + 1), [1] * (n + 1)
        for i in range(n - 1, -1, -1):
            b = None
            for k in range(min(MAXN, n - i), 0, -1):
                q = known(''.join(cs[i:i + k]))
                if q is None:
                    if k > 1:
                        continue
                    q = 0
                c = q - self.QT + best[i + k]
                if b is None or c > b:
                    b, step[i] = c, k
            best[i] = b
        out, i = [], 0
        while i < n:
            out.append(''.join(cs[i:i + step[i]]))
            i += step[i]
        return out

    # ---- what a word shows
    def cedict_key(self, w):
        """the CC-CEDICT traditional headword for a written word: itself, or one with the same simplified form"""
        if w in self.ced:
            return w
        for x in self.forms(w):
            if x in self.ced:
                return x
            for t in self.simp.get(x, []):
                return t
        return None

    def headwords(self, w):
        """the CC-CEDICT traditional headwords a written word shows: itself, and (simplified text) every headword
        whose simplified form it is (发: 發, 髮); else cedict_key()"""
        ks = ([w] if w in self.ced else []) + [t for t in self.simp.get(w, []) if t != w]
        if not ks:
            k = self.cedict_key(w)
            ks = [k] if k else []
        return ks

    def other_forms(self, w):
        """the word in the other script (CC-CEDICT's pairs), at most 3: 發 -> 发, 发 -> 發/髮"""
        out = []
        for k in self.headwords(w):
            out += [k] + self.s_of.get(k, [])
        minor = lambda x: all(not en or all(MINOR.search(g) for g in en) for _, en in self.ced.get(x, [])) if x in self.ced else False
        return sorted((x for x in dict.fromkeys(out) if x != w), key=minor)[:3]   # 干: 乾, 幹 before 乹, 亁

    def readings(self, w):
        """[[numbered, [English]]] for a CC-CEDICT word, one line per reading, "variant of" entries resolved"""
        if w in self._rd:
            return self._rd[w]
        ks = self.headwords(w)
        lines = {}
        ys = [y for k in ks for y, s in zip(self.ced[k], self.ced_s[k]) if k == w or s == w or len(ks) == 1]
        for p, en in ys:
            if len(ks) > 1 and en and all(re.match(r'(old )?variant of ([^|\[\s,;]+)', g) and
                                          re.match(r'(?:old )?variant of ([^|\[\s,;]+)', g).group(1) in ks for g in en):
                continue                           # 为: 爲 'variant of 為' when 為 is already there
            cl = [g for g in en if g.startswith(CL)]
            en2 = [g for g in en if not g.startswith(CL)]
            if en2 and all(re.match(r'(old )?variant of ', g) for g in en2):   # 過份 'variant of 過分': show 過分's senses
                m = re.match(r'(?:old )?variant of ([^|\[\s,;]+)', en2[0])
                tgt = m and self.ced.get(m.group(1))
                if tgt:
                    en2 = en2 + [g for q, e2 in tgt if norm_num(q) == norm_num(p) for g in e2 if not g.startswith(CL)][:6]
            en2 += cl
            q = norm_num(p)
            if q in lines:   # the same reading twice (a surname entry and a word): one line, lower case first
                a = lines[q]
                lines[q] = [p, en2 + a[1]] if a[0][:1].isupper() and not p[:1].isupper() else [a[0], a[1] + en2]
                lines[q][1] = list(dict.fromkeys(lines[q][1]))
            else:
                lines[q] = [p, en2]
        self._rd[w] = list(lines.values())
        return self._rd[w]

    def main_reading(self):
        """single character -> its reading in the most frequent words that use it (CC-CEDICT × jieba)"""
        if self._main is None:
            w = {}
            for t, es in self.ced.items():
                fs = self.forms(t)
                f = max(self.freq.get(x, 0) for x in fs[:8])
                for p, en in es:
                    if p[:1].isupper():
                        continue
                    sy = norm_num(p).split()
                    if len(sy) != len(t):
                        continue
                    for c, y in zip(t, sy):
                        w.setdefault(c, {}).setdefault(y, 0)
                        w[c][y] += f + 1
                    for s in self.s_of.get(t, []):     # the simplified characters too (Wenyan: 发, 还, 长…)
                        if len(s) == len(t):
                            for c, d, y in zip(s, t, sy):
                                if c != d:
                                    w.setdefault(c, {}).setdefault(y, 0)
                                    w[c][y] += f + 1
            self._main = {c: max(v, key=v.get) for c, v in w.items()}
        return self._main

    def default_reading(self, w, rs):
        """index of the reading the sheet opens with when the sentence does not decide (a pure function of the word)"""
        nums = [norm_num(p) for p, _ in rs]
        minor = lambda i: all(MINOR.search(g) for g in rs[i][1]) if rs[i][1] else True
        name = lambda i: rs[i][0][:1].isupper()
        cw = self.canon(w)
        want = [SINGLE.get(w) or SINGLE.get(cw), WORD_PY.get(w) or WORD_PY.get(cw)]
        if len(w) == 1:
            want.append(self.main_reading().get(w))
        else:
            want.append(norm_num(self.hsk[w]) if w in self.hsk else None)
            if self.py and len(nums) > 1:
                s = self.score(w)
                want.append(' '.join(norm_num(y) for y in self.py(s[1] if s else w)))
        for x in want:
            if x and x in nums and not name(nums.index(x)):
                return nums.index(x)
        return sorted(range(len(rs)), key=lambda i: (name(i), minor(i), -len(rs[i][1]), not nums[i].endswith('5')))[0]

    def entry(self, w):
        """(score, lines [[marks, English]], numbered readings) for a written word"""
        r = self._entry.get(w)
        if r is None:
            s = self.score(w)
            q = s[0] if s else 0
            rs = self.readings(w)
            if rs:
                d = self.default_reading(w, rs)
                minor = lambda i: all(MINOR.search(g) for g in rs[i][1]) if rs[i][1] else True
                order = [d] + sorted((i for i in range(len(rs)) if i != d), key=lambda i: (rs[i][0][:1].isupper(), minor(i)))
                order = order[:SENSES]
                r = (q, [[marks(rs[i][0]), SEP.join(rs[i][1])] for i in order], [norm_num(rs[i][0]) for i in order])
            else:
                r = (q, [], [])
            self._entry[w] = r
        return r

    def tappable(self, w):
        return bool(self.entry(w)[1])

    # ---- the readings in context
    def read_words(self, words):
        """per word of one run: the line of its entry that fits the sentence, or None (its default, line 0)"""
        out = [None] * len(words)
        cws = [self.canon(w) for w in words]       # Wenyan: the rules are written in traditional
        for j, w in enumerate(words):
            if len(w) != 1 and cws[j] != '多少':
                continue
            e = self.entry(w)
            if not e[2]:
                continue
            if j >= 2 and words[j - 2] == w and words[j - 1] in ('一', '了', '不'):
                out[j] = out[j - 2]                # 數一數, 看了看: the second as the first
                continue
            got = rule(cws[j], cws, j)
            if got and got != e[2][0] and got in e[2]:
                out[j] = e[2].index(got)
        return out


def model():
    global _M
    if _M is None:
        _M = Model()
    return _M


def available():
    return bool(model().ced)


def missing():
    """the data files `make data` fetches that are not there"""
    return [os.path.relpath(f, ROOT) for f in RAW if not os.path.exists(f)]


def _b36(n):
    s = ''
    while True:
        n, r = divmod(n, 36)
        s = '0123456789abcdefghijklmnopqrstuvwxyz'[r] + s
        if not n:
            return s


def key(text):
    """the key of a run in the exceptions: FNV-1a (32 bits) over its code points, '.', its length (zhKey in the app)"""
    h, n = 0x811c9dc5, 0
    for c in text:
        h = ((h ^ ord(c)) * 0x01000193) & 0xffffffff
        n += 1
    return _b36(h) + '.' + _b36(n)


def _put(out, s):
    if out and isinstance(out[-1], str):
        out[-1] += s
    else:
        out.append(s)


def analyse(text, classical=False):
    """[str | [word, reading line or None]]: the build's cut (plain strings merged), each word with its reading here.
    classical: one character at a time, default readings (zhLineClassical in the app)"""
    M = model()
    out = []
    for i, part in enumerate(RUN.split(text or '')):
        if not part:
            continue
        if i % 2 == 0:
            _put(out, part)
            continue
        ws = list(part) if classical else M.cut_run(list(part))
        rs = [None] * len(ws) if classical else M.read_words(ws)
        for w, r in zip(ws, rs):
            if M.tappable(w):
                out.append([w, r])
            else:
                _put(out, w)
    return out


def segment(text):
    """Mandarin text -> [str | [word]] (a list holds a tappable word)"""
    return [t if isinstance(t, str) else [t[0]] for t in analyse(text)]


class Lexicon:
    """the words a set of texts uses, and the readings that differ from a word's default"""
    def __init__(self):
        self.words, self.exc, self.compound = set(), {}, {}

    def _subwords(self, part):
        """every character of a run, and every CC-CEDICT word of 2..MAXN characters in it (Other cuts, Characters)"""
        M = model()
        for i in range(len(part)):
            self.words.add(part[i])
            for k in range(2, min(MAXN, len(part) - i) + 1):
                w = part[i:i + k]
                if M.score(w):
                    self.words.add(w)

    def add(self, text, classical=False):
        M = model()
        for i, part in enumerate(RUN.split(text or '')):
            if not (i % 2 and part):
                continue
            self._subwords(part)
            if classical:
                continue
            ws = M.cut_run(list(part))
            x, n = [], 0
            for w, r in zip(ws, M.read_words(ws)):
                if M.tappable(w):
                    if r:
                        x.append(f'{_b36(n)}.{_b36(r)}')
                    n += 1
            if x:
                k, v = key(part), ','.join(x)
                if self.exc.get(k, v) != v:
                    raise SystemExit(f'zh_words: two runs share the key {k}')
                self.exc[k] = v
        return self

    def add_word(self, w):
        """a course word (glossary, 成語, word card): its entry, or its parts when CC-CEDICT lacks it"""
        M = model()
        for i, part in enumerate(RUN.split(w or '')):
            if not (i % 2 and part):
                continue
            self._subwords(part)
            if len(part) > 1 and not M.score(part):
                self.compound[part] = ' '.join(M.cut_run(list(part)))
        return self

    def table(self, skip=()):
        """{word: "score|" + "pinyin<TAB>senses" lines}; skip: words another table (the app's) already has"""
        out, first = {}, {}
        for w in sorted(self.words):
            if w in skip:
                continue
            q, lines, _ = model().entry(w)
            body = '\n'.join(p + '\t' + en for p, en in lines)
            if body and body in first:          # the same lines as an earlier word (点 / 點): "score|=点"
                body = '=' + first[body]
            elif body:
                first[body] = w
            out[w] = f'{q}|' + body
        return out

    def exceptions(self):
        return dict(sorted(self.exc.items()))

    def meta(self):
        """{word: "i n4 h3 o發/髮"}: 成語 (CC-CEDICT "(idiom" or jieba's i), NHSK level, HSK (2012) level, the other
        script's forms. Not repeated where the browser can infer it (zhMeta in app/src/dict.js): a form listed under
        an earlier word (發 under 发) and levels an earlier form of the word already carries."""
        M, out, keep = model(), {}, {}
        ws = sorted(self.words | set(self.compound))
        have = set(ws)
        for w in ws:
            if not M.tappable(w) and w not in self.compound:
                continue
            f = M.forms(w)
            en = ' '.join(e for _, e in M.entry(w)[1])
            oth = M.other_forms(w)
            m = []
            if len(w) > 2 and ('(idiom' in en or (M.tappable(w) and any(x in M.idiom for x in f[:8]))):
                m.append('i')
            lv = []
            nh = next((M.nhsk_lv[x] for x in [w] + f[:8] + oth if x in M.nhsk_lv), None)
            hk = next((M.hsk_lv[x] for x in [w] + f[:8] + oth if x in M.hsk_lv), None)
            if nh:
                lv.append('n' + nh)
            if hk:
                lv.append('h' + str(hk))
            # an earlier form in the table that keeps the same levels: the browser takes them from it
            if not (lv and any(x < w and keep.get(x) == lv for x in oth if x in have)):
                m += lv
            keep[w] = lv if lv and lv == [t for t in m if t[0] in 'nh'] else keep.get(w)
            o = [x for x in oth if not (x in have and x < w and w in M.other_forms(x))]
            if o:
                m.append('o' + '/'.join(o))
            if m:
                out[w] = ' '.join(m)
        return out

    def parts(self):
        return dict(sorted(self.compound.items()))


def browser(text, table, exc, classical=False):
    """what the app shows for a text from a table and exceptions (zhCut / zhLineClassical in app/src/dict.js)"""
    M = model()
    def known(w):
        e = table.get(w)
        return int(e[:e.index('|')]) if e is not None else None
    tap = lambda w: w in table and table[w].split('|', 1)[1] not in ('', '=')
    out = []
    for i, part in enumerate(RUN.split(text or '')):
        if not part:
            continue
        if i % 2 == 0:
            _put(out, part)
            continue
        toks = []
        for w in (list(part) if classical else M.cut_run(list(part), known)):
            if tap(w):
                toks.append([w, None])
                out.append(toks[-1])
            else:
                _put(out, w)
        if not classical:
            x = dict(tuple(int(v, 36) for v in y.split('.')) for y in exc.get(key(part), '').split(',') if y)
            for j, t in enumerate(toks):
                t[1] = x.get(j)
    return out


def check(texts, table, exc, classical=()):
    """number of texts the browser would cut or read differently from the build (should be 0); classical: the texts
    shown one character at a time"""
    bad = 0
    for t in texts:
        c = t in classical
        if browser(t, table, exc, c) != analyse(t, c):
            bad += 1
            if bad <= 5:
                print('zh_words: the browser would show this text differently:', t[:60])
    return bad


def show(text):
    """one line for a person: words separated by /, each with the reading shown (* = chosen by the sentence)"""
    M, out = model(), []
    for t in analyse(text):
        if isinstance(t, str):
            out.append(t)
        else:
            py = M.entry(t[0])[1][t[1] or 0][0].replace(' ', '')
            out.append(f"{t[0]}({py}{'*' if t[1] else ''})")
    return '/'.join(out)


if __name__ == '__main__':   # python3 -I tools/zh_words.py 太過份了  -> the cut and the readings; --self-check
    import sys
    if sys.argv[1:] == ['--self-check']:
        if missing():
            sys.exit('zh_words: missing ' + ', '.join(missing()) + ' (make data)')
        cases = {'你把事情搞到這種地步才要我來善後，不會太過份了嗎？': None,
                 '他睡不著。': '著(zháo*)', '他睡不着。': '着(zháo*)',
                 '我得走了': '得(děi*)', '他跑得很快': '得(de)', '为了你': '为了(wèile)', '還錢': '還(huán*)',
                 '还钱': '还(huán*)', '长大': '长大(zhǎngdà)', '头发很长': '长(cháng)', '慢慢地走': '地(de*)'}
        bad = 0
        for s, want in cases.items():
            got = show(s)
            ok = want is None or want in got
            bad += not ok
            print('ok ' if ok else 'BAD', got)
        L = Lexicon()
        ts = list(cases)
        for t in ts:
            L.add(t)
        n = check(ts, L.table(), L.exceptions()) + check(ts, L.table(), L.exceptions(), set(ts))
        print('browser check:', n, 'texts shown differently')
        sys.exit(1 if bad or n else 0)
    for s in sys.argv[1:] or ['你把事情搞到這種地步才要我來善後，不會太過份了嗎？']:
        print(show(s))
