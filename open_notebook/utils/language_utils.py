from typing import Literal, Optional

OutputLanguage = Literal["en", "zh-CN"]


def parse_output_language(accept_language: Optional[str]) -> OutputLanguage:
    if not accept_language:
        return "en"
    first = accept_language.split(",")[0].strip()
    if first.lower().startswith("zh"):
        return "zh-CN"
    return "en"


def build_output_language_instruction(output_language: OutputLanguage) -> str:
    if output_language == "zh-CN":
        return "Use Simplified Chinese (zh-CN) for all output."
    return "Use English for all output."

